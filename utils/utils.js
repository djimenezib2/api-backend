const crypto = require('crypto');
const fs = require('fs');

exports.isApiAuthorized = (req) => {
  return req.headers['api-key'] === process.env.SCRAPPER_API_KEY;
};

exports.sanitizeRegexString = (str) => str.replace(/[?|{}\\$^]/g, '\\$&');

exports.isBlackListedDomain = (domain) => {
  const rawdata = fs.readFileSync('src/legacy/config/domains-blacklisted.json');
  const domains = JSON.parse(rawdata).domains;

  return domains.includes(domain);
};

exports.isPublicDomain = (domain) => {
  const rawdata = fs.readFileSync('src/legacy/config/domains-public.json');
  const domains = JSON.parse(rawdata).domains;

  return domains.includes(domain);
};

exports.createRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
