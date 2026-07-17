const path = require('node:path');
const express = require('express');
const helmet = require('helmet');

const hivesRouter = require('./routes/hives');
const inspectionsRouter = require('./routes/inspections');

const app = express();
const PORT = process.env.PORT || 3000;

// crossOriginEmbedderPolicy is off by default in helmet since it can break
// sites embedding cross-origin resources; this app doesn't embed any.
// styleSrc/fontSrc are tightened from helmet's defaults (which allow
// 'unsafe-inline' and any https: source) since this app has no inline
// styles and loads no external fonts.
app.use(
  helmet({
    crossOriginEmbedderPolicy: true,
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'style-src': ["'self'"],
        'font-src': ["'self'"],
      },
    },
  })
);
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

// Express's own default 404 handler overwrites the Content-Security-Policy
// header with a minimal one that omits frame-ancestors/form-action, which
// undoes the policy set above. Handling 404s ourselves keeps our headers.
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Bee hive tracker running at http://localhost:${PORT}`);
});
