module.exports = {
  truecordUrl: process.env.TRUECORD_URL || 'https://157.22.185.96:8443/',
  trustedHosts: new Set([
    '157.22.185.96',
    '157-22-185-96.sslip.io',
    'truecord.157.22.185.96.sslip.io'
  ])
};

