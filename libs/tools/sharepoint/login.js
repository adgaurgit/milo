/* global msal */
import { spAccessToken } from './state.js';
import { getMSALConfig } from './msal.js';

export default async function loginToSharePoint(scope = [], telemetry = {}) {
  const msalConfig = await getMSALConfig(telemetry);
  const pca = new msal.PublicClientApplication(msalConfig);

  let account = pca.getAllAccounts()[0];

  if (!account) {
    await pca.loginPopup(msalConfig.login);
    [account] = pca.getAllAccounts();
  }

  const scopes = scope;
  const reqDetails = { account, scopes };

  try {
    const res = await pca.acquireTokenSilent(reqDetails);
    spAccessToken.value = res.accessToken;
  } catch (err) {
    throw new Error(`Cannot connect to Sharepoint: ${err.message}`);
  }
}
