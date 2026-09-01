function health(req, res) {
  res.json({ status: 'ok', service: 'aaraish-backend' });
}

function configStatus(req, res) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
  const CURRENCY = process.env.STRIPE_CURRENCY || 'pkr';
  res.json({ stripe_configured: !!STRIPE_SECRET_KEY, currency: CURRENCY });
}

module.exports = { health, configStatus };
