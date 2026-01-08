import { Router } from 'express';

export const wellKnownRoute = Router();

// 1. iOS Universal Links
wellKnownRoute.get('/.well-known/apple-app-site-association', (req, res) => {
  // Apple requires this specific Content-Type
  res.setHeader('Content-Type', 'application/json');
  
  res.json({
    "applinks": {
      "apps": [],
      "details": [
        {
          // REPLACE THIS WITH YOUR ACTUAL IDs
          // Format: <TeamID>.<BundleID>
          // Example: "8X55555555.com.creditsea.app"
          "appID": "AVD9XJ3GSJ.com.creditsea.app",
          "paths": [ "/r/*" ] // Only links starting with /r/ will open the app
        }
      ]
    }
  });
});

// 2. Android App Links (Bonus: You will need this too)
wellKnownRoute.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  res.json([{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.creditsea.app",
      "sha256_cert_fingerprints": [
        // Run "keytool -list -v -keystore your.keystore" to get this
        "41:41:3D:13:00:87:A5:35:0B:4A:93:B9:49:BD:44:92:41:0B:95:9F:8B:0E:12:1D:B4:52:7D:F9:45:90:F5:04",
        "2C:6C:F6:E3:56:DC:8A:08:B6:68:43:34:99:07:EF:EE:28:DE:16:EF:7D:9D:58:74:6A:BD:12:72:44:84:E5:34",
        "41:41:3D:13:00:87:A5:35:0B:4A:93:B9:49:BD:44:92:41:0B:95:9F:8B:0E:12:1D:B4:52:7D:F9:45:90:F5:04"
      ]
    }
  }]);
});