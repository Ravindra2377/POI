const endpoints = [
  ["web", "http://localhost:3000/api/health"],
  ["api", "http://localhost:8000/health"],
];

for (const [name, url] of endpoints) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${name} health check failed with ${response.status}`);
  }
  const body = await response.json();
  console.log(`${name}: ${body.status}`);
}
