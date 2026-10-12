// import { google } from "googleapis";

// export function getGoogleOAuthClient() {
//   const clientId = process.env.GOOGLE_CLIENT_ID;
//   const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
//   const redirectUri = process.env.GOOGLE_REDIRECT_URI;

//   if (!clientId || !clientSecret || !redirectUri) {
//     throw new Error("Google OAuth environment variables are missing");
//   }

//   return new google.auth.OAuth2(
//     clientId,
//     clientSecret,
//     redirectUri
//   );
// }

// export function getGoogleAuthUrl() {
//   const oauth2Client = getGoogleOAuthClient();

//   return oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     prompt: "consent",
//     scope: [
//       "https://www.googleapis.com/auth/gmail.send",
//     ],
//   });
// }

import { google } from "googleapis";

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is missing");
  }

  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is missing");
  }

  if (!redirectUri) {
    throw new Error("GOOGLE_REDIRECT_URI is missing");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

export function getGoogleAuthUrl() {
  const oauth2Client = getGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",

    // Forces Google to show account selection.
    // This is useful when multiple Google accounts
    // are logged into the browser.
    prompt: "consent select_account",

    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  });
}