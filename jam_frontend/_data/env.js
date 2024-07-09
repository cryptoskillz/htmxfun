let todaysDate = new Date();
let _YEAR = todaysDate.getFullYear();

const commonConfig = {
  YEAR: _YEAR,
};

const envConfigs = {
  local: {
    ...commonConfig,
    ENVIRONMENT: "local",
    API_URL: "http://localhost:8787/",
    API_JWT_URL: "http://localhost:8788/",
  },
  production: {
    ...commonConfig,
    ENVIRONMENT: "production",
    API_URL: "https://test3.orbitlabsworker.workers.dev",
    API_JWT_URL: "https://jwt.orbitlabsworker.workers.dev",
  },
};

module.exports = (env) => {
  return envConfigs[env] || envConfigs.local;
};
