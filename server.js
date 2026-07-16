const path = require('node:path');
const express = require('express');

const hivesRouter = require('./routes/hives');
const inspectionsRouter = require('./routes/inspections');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/hives', hivesRouter);
app.use('/api/hives/:hiveId/inspections', inspectionsRouter);

app.listen(PORT, () => {
  console.log(`Bee hive tracker running at http://localhost:${PORT}`);
});
