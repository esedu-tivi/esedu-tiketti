import { LogLevel } from '@azure/msal-browser';

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI,
    postLogoutRedirectUri: '/',
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Info,
    },
  },
};

// Basic login request for authentication - use OpenID Connect + Graph for compatibility
export const loginRequest = {
  // This combination should work without exposing API scopes
  scopes: ['openid', 'profile', 'User.Read'],
  // Alternative: Try client ID directly (uncomment if needed)
  // scopes: [`${import.meta.env.VITE_MSAL_CLIENT_ID}/.default`],
};

// Request for Microsoft Graph API access - use only basic permissions that don't require admin consent
export const graphRequest = {
  scopes: ['User.Read'], // Only requesting current user info, no admin consent needed
}; 