const path = require('node:path');
const express = require('express');
const helmet = require('helmet');

const hivesRouter = require('./routes/hives');
const inspectionsRouter = require('./routes/inspections');

const app = express();
const PORT = process.env.PORT || 3000;

// crossOriginEmbedderPolicy is off by default in helmet since it can break
// sites embedding cross-origin resources; this app doesn't embed any.
app.use(helmet({ crossOriginEmbedderPolicy: true }));
// helmet doesn't ship a default Permissions-Policy; this app doesn't use any
// of these browser features, so deny them explicitly.
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/hives', hivesRouter);
app.use('/api/hives/:hiveId/inspections', inspectionsRouter);

app.listen(PORT, () => {
  console.log(`Bee hive tracker running at http://localhost:${PORT}`);
});
