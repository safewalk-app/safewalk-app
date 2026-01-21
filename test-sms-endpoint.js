const http = require('http');

const data = JSON.stringify({
  phoneNumbers: ['+33763458273'],
  limitTimeStr: '14:30',
  tolerance: 0,
  location: { latitude: 48.8566, longitude: 2.3522 }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/sms/alert',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response:', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

console.log('📤 Envoi de la requête...');
req.write(data);
req.end();
