# Google ads integration

## Website: Google AdSense

The root application now loads the official AdSense script only when
`VITE_ADSENSE_PUBLISHER_ID` is configured and matches the publisher ID format
(`ca-pub-<16 digits>`). The loader does not invent an ID and does not expose
any private credentials.

Before enabling ads:
1. Add `VITE_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXXXX` to the website's
   production environment variables.
2. Verify ownership of the production domain in the AdSense account and submit
   the site for review.
3. Publish a valid `ads.txt` file using the exact line supplied by AdSense.
4. After approval, configure ad units and place responsive ad slots in approved,
   policy-compliant page locations. Do not click your own ads or encourage clicks.

The publisher ID and ads.txt publisher line must come from the owner's AdSense
account. The site must not display ads or claim approval before Google approves it.

## Android: Google AdMob

AdMob is not yet integrated into the Android binary. Do not use placeholder
production IDs. Before SDK integration, register the Android app in AdMob and
supply:
- AdMob Android App ID (format: `ca-app-pub-...~...`)
- Banner ad unit ID
- Interstitial ad unit ID (optional)
- Rewarded ad unit ID (only if rewards are implemented and server-verified)

Then add the official Google Mobile Ads SDK to the Android Gradle module,
declare the App ID in the Android manifest, initialize the SDK once at app
startup, and use Google's test ad unit IDs during development. Replace test
IDs only after release configuration and policy review.

Rewarded VPN data/quota must never be granted based only on a client callback.
Use AdMob server-side verification, validate the signed callback, enforce
idempotency and daily caps on the server, and only then credit the reward.
Until this server-side flow is complete, keep rewarded ads and ad-based VPN
rewards disabled.

## Required owner inputs

No passwords or secret keys are needed in chat. Supply only the public AdSense
publisher ID and public AdMob App/ad-unit IDs through the project's deployment
and mobile build configuration. Never commit service credentials or signing keys.
