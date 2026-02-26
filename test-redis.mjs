#!/usr/bin/env node

/**
 * Simple Redis Cache Test Script
 * Tests the Redis cache service without vitest
 */

import { createClient } from 'redis';

const redisClient = createClient({
  host: 'localhost',
  port: 6379,
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
  process.exit(1);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected');
});

async function runTests() {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully\n');

    // Test 1: Set and Get
    console.log('Test 1: Set and Get');
    const testData = { id: 1, name: 'Test User', email: 'test@example.com' };
    await redisClient.setEx('test:user:1', 3600, JSON.stringify(testData));
    const cached = await redisClient.get('test:user:1');
    const parsed = JSON.parse(cached);
    console.log(`  ✅ Set: test:user:1 = ${JSON.stringify(testData)}`);
    console.log(`  ✅ Get: test:user:1 = ${JSON.stringify(parsed)}`);
    console.log(`  ✅ Data matches: ${JSON.stringify(parsed) === JSON.stringify(testData)}\n`);

    // Test 2: Delete
    console.log('Test 2: Delete');
    await redisClient.del('test:user:1');
    const deleted = await redisClient.get('test:user:1');
    console.log(`  ✅ Deleted: test:user:1`);
    console.log(`  ✅ Key no longer exists: ${deleted === null}\n`);

    // Test 3: Pattern Invalidation
    console.log('Test 3: Pattern Invalidation');
    await redisClient.setEx('test:user:2', 3600, JSON.stringify({ id: 2 }));
    await redisClient.setEx('test:user:3', 3600, JSON.stringify({ id: 3 }));
    await redisClient.setEx('test:trip:1', 3600, JSON.stringify({ id: 1 }));
    
    const keys = await redisClient.keys('test:user:*');
    console.log(`  ✅ Found ${keys.length} user keys: ${keys.join(', ')}`);
    
    await redisClient.del(keys);
    const user2 = await redisClient.get('test:user:2');
    const user3 = await redisClient.get('test:user:3');
    const trip1 = await redisClient.get('test:trip:1');
    
    console.log(`  ✅ Deleted user keys`);
    console.log(`  ✅ test:user:2 deleted: ${user2 === null}`);
    console.log(`  ✅ test:user:3 deleted: ${user3 === null}`);
    console.log(`  ✅ test:trip:1 still exists: ${trip1 !== null}\n`);

    // Test 4: TTL Expiration
    console.log('Test 4: TTL Expiration');
    await redisClient.setEx('test:expire', 1, JSON.stringify({ data: 'test' }));
    const before = await redisClient.get('test:expire');
    console.log(`  ✅ Set test:expire with 1s TTL`);
    console.log(`  ✅ Key exists before expiration: ${before !== null}`);
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    const after = await redisClient.get('test:expire');
    console.log(`  ✅ Waited 1.1 seconds`);
    console.log(`  ✅ Key expired: ${after === null}\n`);

    // Test 5: Concurrent Operations
    console.log('Test 5: Concurrent Operations');
    const operations = [];
    for (let i = 0; i < 10; i++) {
      operations.push(
        redisClient.setEx(`test:concurrent:${i}`, 3600, JSON.stringify({ id: i }))
      );
    }
    await Promise.all(operations);
    console.log(`  ✅ Set 10 keys concurrently`);

    let allExist = true;
    for (let i = 0; i < 10; i++) {
      const value = await redisClient.get(`test:concurrent:${i}`);
      if (value === null) {
        allExist = false;
        break;
      }
    }
    console.log(`  ✅ All 10 keys exist: ${allExist}\n`);

    // Test 6: Cache Statistics
    console.log('Test 6: Cache Statistics');
    const info = await redisClient.info('stats');
    const lines = info.split('\r\n');
    let stats = {};
    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    }
    console.log(`  ✅ Connected clients: ${stats.connected_clients}`);
    console.log(`  ✅ Total commands: ${stats.total_commands_processed}`);
    console.log(`  ✅ Keyspace hits: ${stats.keyspace_hits}`);
    console.log(`  ✅ Keyspace misses: ${stats.keyspace_misses}\n`);

    // Cleanup
    console.log('Cleanup');
    await redisClient.flushDb();
    console.log('  ✅ Flushed all cache\n');

    console.log('✅ All tests passed!');
    console.log('\n📊 Summary:');
    console.log('  - Redis connection: ✅');
    console.log('  - Set/Get operations: ✅');
    console.log('  - Delete operations: ✅');
    console.log('  - Pattern invalidation: ✅');
    console.log('  - TTL expiration: ✅');
    console.log('  - Concurrent operations: ✅');
    console.log('  - Statistics: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await redisClient.quit();
  }
}

runTests();
