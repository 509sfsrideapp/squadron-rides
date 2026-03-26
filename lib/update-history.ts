export type UpdateHistoryEntry = {
  commit: string;
  title: string;
  summary: string;
};

// Newest first. Add each new shipped update to the top of this list.
export const UPDATE_HISTORY: UpdateHistoryEntry[] = [
  {
    commit: "pending",
    title: "Rider Status Layout Tightening",
    summary: "Removed the extra top ride-status bubble on the rider page and moved the Cancel Ride button to sit directly under the live map.",
  },
  {
    commit: "9f61beb",
    title: "Single Active Push Token Per Driver",
    summary: "Changed push registration so each account keeps just one current active token, which should stop the same driver phone from getting duplicate ride request alerts from old saved sessions.",
  },
  {
    commit: "7f6bc36",
    title: "Rider Status Page Cleanup",
    summary: "Removed the extra GPS and driver email lines from the rider status page and moved the call/text driver buttons directly under the main status box.",
  },
  {
    commit: "da2b3e9",
    title: "Startup Splash Viewport Smoothing",
    summary: "Adjusted the startup splash to use steadier mobile viewport sizing and cleaner safe-area padding so it stays flush with the screen during the vault animation.",
  },
  {
    commit: "4d7267b",
    title: "Driver Live Map and Rider Tracking",
    summary: "Added the live map to the driver active ride page and made the rider location keep updating during the ride so both rider and driver pages stay live.",
  },
  {
    commit: "d64424c",
    title: "Driver Pickup Copy Cleanup",
    summary: "Removed the extra navigation helper sentence on the driver active ride page and added a warning that resolved pickup locations may need rider confirmation.",
  },
  {
    commit: "2199a45",
    title: "Driver Maps Auto-Launch Guardrails",
    summary: "Tightened active-ride map launching so it only fires during real driver ride stages and no longer tries to open maps after a canceled ride.",
  },
  {
    commit: "a4ebd16",
    title: "Emergency Ride Destination Fix",
    summary: "Fixed one-tap emergency rides so once the rider is picked up, navigation uses the saved home address instead of the temporary destination placeholder.",
  },
  {
    commit: "698c960",
    title: "Rider Update Notification Wording",
    summary: "Adjusted rider push notifications so acceptance alerts focus on who accepted the ride, while arrival alerts clearly repeat the driver vehicle details.",
  },
  {
    commit: "036da0c",
    title: "Single-Path Notification Delivery",
    summary: "Changed push alerts to a data-driven notification flow so the service worker is the only path that shows ride-request notifications, which should stop double alerts.",
  },
  {
    commit: "d2ba7b9",
    title: "Notification Backend Dedupe Fix",
    summary: "Updated the server-side notification lookup to prefer one token per device, so stale old tokens stop causing duplicate ride-request alerts.",
  },
  {
    commit: "3dd498c",
    title: "Vault Centerpiece Removal",
    summary: "Removed the big circular vault centerpiece from the startup screen so the panel and door visuals stay cleaner.",
  },
  {
    commit: "cf948fe",
    title: "Vault Overlay Cleanup",
    summary: "Removed the leftover circular target-style overlay from the startup vault screen so the hardware visuals stay clean.",
  },
  {
    commit: "2de3b5e",
    title: "Vault Hardware Visual Pass",
    summary: "Upgraded the startup vault with heavier metal doors, built-in status screens, and a central lock assembly so it feels more like a real secure vault.",
  },
  {
    commit: "e287ca9",
    title: "Notification Token Deduping",
    summary: "Changed push notification storage to keep one active token per device so ride request alerts stop duplicating on the same phone.",
  },
  {
    commit: "900bf80",
    title: "Vault Door Motion Cleanup",
    summary: "Smoothed out the startup vault-door animation so the doors open more evenly instead of jumping apart at the start.",
  },
  {
    commit: "a2a5990",
    title: "Vault Timing Extension",
    summary: "Extended the startup splash to three seconds total and slowed the vault doors down to a full two-second opening animation.",
  },
  {
    commit: "cfbfc15",
    title: "Startup Flash Fixes",
    summary: "Stopped the home page and logged-out screen from flashing at the wrong times during startup, and slowed the vault-door opening a little more.",
  },
  {
    commit: "6ac8f36",
    title: "Vault Reveal Timing Refinement",
    summary: "Slowed the startup vault doors and changed the reveal so the home page is already underneath, making it feel like the doors are opening onto the app instead of fading to it afterward.",
  },
  {
    commit: "d8dca78",
    title: "Vault-Style Startup Screen",
    summary: "Reworked the first-open loading screen into a more techy military vault with split doors that open vertically to reveal the app underneath.",
  },
  {
    commit: "d37615f",
    title: "Homepage Mission Hub Removed",
    summary: "Removed the Mission Hub card from the homepage so that area can be redesigned later without affecting the main emergency ride button and app grid.",
  },
  {
    commit: "46d1793",
    title: "Dev Tile for All Accounts",
    summary: "Made the Dev app tile stay visible for any logged-in account instead of hiding it behind the admin account only.",
  },
  {
    commit: "c2549eb",
    title: "Ride Flow Hardening",
    summary: "Locked down duplicate ride requests, double-accept conflicts, ride stage order, and driver clock-out/availability behavior so the core ride system is more reliable.",
  },
  {
    commit: "cc4f907",
    title: "Admin Name Save Fix",
    summary: "Fixed the admin account fallback name logic so Account Settings saves would not break.",
  },
  {
    commit: "a88d3ed",
    title: "Admin Settings Import Fix",
    summary: "Fixed a missing admin helper import that was breaking the production build.",
  },
  {
    commit: "6f7ad06",
    title: "Admin Profile Exemption",
    summary: "Made the admin account exempt from the normal member profile requirements like last name, rank, and flight.",
  },
  {
    commit: "16948ac",
    title: "Account Save Feedback",
    summary: "Fixed Account Settings save behavior and moved the save message directly under the save button.",
  },
  {
    commit: "f1d4a63",
    title: "Password Change Flow",
    summary: "Added a proper Change Password page linked from Account Settings.",
  },
  {
    commit: "080baa9",
    title: "Mission Brief Cleanup",
    summary: "Changed the homepage readiness cards so they only appear when something actually needs attention and now link to the correct fix page.",
  },
  {
    commit: "4628458",
    title: "Designated Defenders Rename",
    summary: "Changed the main app branding from Defender Drivers to Designated Defenders and updated supporting branding text.",
  },
  {
    commit: "28c7e3a",
    title: "Homepage Leadership Polish",
    summary: "Cleaned up the homepage layout, mission hub, app tiles, and primary emergency ride button to make the app more presentation-ready.",
  },
  {
    commit: "7fc2214",
    title: "Developer Inbox Typing Fix",
    summary: "Fixed the developer submissions route typing so the bug and suggestions inbox pages could build correctly.",
  },
  {
    commit: "12689b6",
    title: "Developer Feedback Inbox Fix",
    summary: "Fixed the developer bug and suggestions pages so submitted items actually show up there.",
  },
  {
    commit: "9f3efc8",
    title: "Typography Refresh",
    summary: "Upgraded the app typography with a sharper heading font and cleaner body text for a more polished look.",
  },
  {
    commit: "a832440",
    title: "Back Buttons Removed",
    summary: "Removed the shared back-button system after it started causing navigation issues.",
  },
  {
    commit: "25ef703",
    title: "Driving Simulator Centering Fix",
    summary: "Improved the dev-only driving simulator with better tilt centering and an immersive full-screen style.",
  },
  {
    commit: "0080af0",
    title: "Simulator Recenter Update",
    summary: "Adjusted the simulator tilt calibration and added a fuller screen experience for mobile testing.",
  },
  {
    commit: "0bc9b1f",
    title: "Simulator Visual Polish",
    summary: "Made the dev driving simulator feel more like a real game with better controls, road art, and obstacle visuals.",
  },
  {
    commit: "cf7fdf2",
    title: "Driving Simulator Prototype",
    summary: "Added a dev-only impaired-driving simulator as a hidden experimental feature.",
  },
  {
    commit: "dc4fe6f",
    title: "Back Button Login Skip",
    summary: "Adjusted the shared back navigation so it would not send users back to login pages.",
  },
  {
    commit: "caf94d5",
    title: "Back Button Visibility Fix",
    summary: "Hid the back button when there was no page history to go back to.",
  },
  {
    commit: "c8cd844",
    title: "Back Icon Weight Update",
    summary: "Made the shared back icon bolder and easier to see.",
  },
  {
    commit: "fb3497e",
    title: "Back Button Placement",
    summary: "Moved the floating back button to the lower-left corner and refined its icon.",
  },
  {
    commit: "905a52a",
    title: "Shared Back Buttons",
    summary: "Added shared top and bottom back buttons across the app before the system was later removed.",
  },
  {
    commit: "5f75baf",
    title: "Home Page Type Fix",
    summary: "Fixed a duplicate type field on the homepage that was breaking the build.",
  },
  {
    commit: "6d0fa0e",
    title: "Ride Privacy Hardening",
    summary: "Tightened ride access rules and reduced what open ride cards show to protect rider privacy while still letting drivers see requests.",
  },
  {
    commit: "c81a1eb",
    title: "Emergency Ride GPS Fix",
    summary: "Fixed one-tap emergency ride requests so they use the rider’s live location instead of always falling back to the saved home address.",
  },
  {
    commit: "df16d3f",
    title: "One-Tap Blocker Messages",
    summary: "Added homepage warning text under the emergency ride button when one-tap request is blocked by permissions or location settings.",
  },
  {
    commit: "3d1067c",
    title: "Clock In and GPS Restore",
    summary: "Restored the Clock In button on the driver dashboard and made one-tap emergency ride try to send live GPS again.",
  },
  {
    commit: "cad7353",
    title: "Signup Permission Variable Fix",
    summary: "Fixed a broken variable name in the signup permissions flow that was causing builds to fail.",
  },
  {
    commit: "7db621d",
    title: "Emergency Ride Permission Flow",
    summary: "Turned the main emergency ride button into a one-tap flow when allowed and added an App Permissions page to review that setting later.",
  },
  {
    commit: "de9bfd2",
    title: "Shorter Startup Splash",
    summary: "Reduced the first-open splash screen from three seconds down to two.",
  },
  {
    commit: "59fb58f",
    title: "Simpler Dev Icon",
    summary: "Changed the Dev app icon to a simple code-style symbol.",
  },
  {
    commit: "b942e4e",
    title: "First App Permission Term",
    summary: "Added the first real emergency ride permission checkbox to the signup permissions page.",
  },
  {
    commit: "e2bc49b",
    title: "Dev Tile and Footer Links",
    summary: "Moved Dev into the homepage app grid and changed bug report and suggestions into smaller footer-style links.",
  },
  {
    commit: "b4f4f5e",
    title: "Signup Terms Checkpoint",
    summary: "Added a required terms/app-permissions checkpoint after signup form completion and before the account is created.",
  },
  {
    commit: "00ff55b",
    title: "Inbox Split",
    summary: "Renamed Messages to Inbox for system threads and split direct messages into their own separate app tile.",
  },
  {
    commit: "de883be",
    title: "Messages Type Fix",
    summary: "Fixed a message icon typing issue that was breaking production builds.",
  },
  {
    commit: "70632b4",
    title: "Inbox Framework",
    summary: "Added the first framework for Notifications, Admin, Dev, and future direct messages in a proper inbox structure.",
  },
  {
    commit: "22530c7",
    title: "Global Chat Cleanup",
    summary: "Improved dev chat with better scrolling, spam protection, grouping, moderation, and tighter access control.",
  },
  {
    commit: "e7aac7e",
    title: "Flashing Transition Removal",
    summary: "Removed an over-aggressive route transition effect that was causing the app to flash during navigation.",
  },
  {
    commit: "0924a78",
    title: "Route Transition Shell",
    summary: "Tried a route-stabilizing transition shell to smooth page changes before later removing it.",
  },
  {
    commit: "87f7b42",
    title: "Delayed Loaders",
    summary: "Made loaders wait until a page is actually taking a little longer so the spinner doesn’t flash on every quick page change.",
  },
  {
    commit: "25e5048",
    title: "Splash Once Per Session",
    summary: "Changed the startup splash so it only appears on first app open instead of every time you return home.",
  },
  {
    commit: "8fbb334",
    title: "Initial Splash Screen",
    summary: "Added a dedicated startup-only splash screen for when the app first opens.",
  },
  {
    commit: "bd6a433",
    title: "Homepage App Grid",
    summary: "Added the first homepage app grid layout under the main ride button with room for more apps later.",
  },
  {
    commit: "a38a065",
    title: "Reverse Dropdown Close Animation",
    summary: "Made the profile menu close animation play back in reverse order.",
  },
  {
    commit: "9dccda7",
    title: "Animated Profile Menu",
    summary: "Added a smooth open animation to the home profile dropdown menu.",
  },
  {
    commit: "086d118",
    title: "Home Driver Access Cleanup",
    summary: "Removed the old clock-in flow from the homepage and replaced it with a cleaner Driver Dashboard entry point.",
  },
  {
    commit: "021ba29",
    title: "Dev Access Linked Pages Fix",
    summary: "Stopped the developer PIN from resetting while moving between linked dev tools like chat and loader previews.",
  },
  {
    commit: "0ced537",
    title: "Admin Accounts Page Split",
    summary: "Moved admin account management into its own page with expandable user cards so the main admin page stays cleaner.",
  },
  {
    commit: "c6f3f2f",
    title: "Developer Lock on Exit",
    summary: "Made developer access expire when leaving the dev area so the PIN must be re-entered next time.",
  },
  {
    commit: "c2898ae",
    title: "Profile Menu Dropdown",
    summary: "Changed the home profile photo into a dropdown menu with Settings, Inbox, and Log Out.",
  },
  {
    commit: "66d9a3d",
    title: "Dev Bottom Nav Button",
    summary: "Moved the Dev entry into the bottom utility nav next to the feedback tools before later moving it again.",
  },
  {
    commit: "b01984d",
    title: "Consent Checkbox Fix",
    summary: "Fixed broken checkbox behavior on the bug report and suggestions forms.",
  },
  {
    commit: "dcf5a3d",
    title: "Suggestions System",
    summary: "Added a real suggestions and feedback submission page plus a developer inbox to review submissions.",
  },
  {
    commit: "ec0f764",
    title: "Bug Report Contact Consent",
    summary: "Added a phone contact consent checkbox to bug reports and showed that choice in the developer inbox.",
  },
  {
    commit: "7ab072c",
    title: "Bug Report System",
    summary: "Added a real bug report form and a developer page to read submitted bug reports with reporter info.",
  },
  {
    commit: "16adbbf",
    title: "Admin Ride History Page",
    summary: "Moved the admin ride history into its own page and added filters for rider, driver, status, and date range.",
  },
  {
    commit: "e3ac1de",
    title: "Admin Account Controls",
    summary: "Added admin account search, view, freeze, unfreeze, and delete controls with logout enforcement for frozen users.",
  },
  {
    commit: "56931fb",
    title: "Address Verification Removal",
    summary: "Removed blocking address verification and replaced it with a note telling users to double-check their saved address.",
  },
  {
    commit: "2e1f01e",
    title: "Structured Address Readiness Fix",
    summary: "Fixed a leftover home address reference after moving to structured address fields.",
  },
  {
    commit: "56d6258",
    title: "Better Signup Errors",
    summary: "Made signup failures show specific reasons like weak password or email already in use.",
  },
  {
    commit: "0f93e90",
    title: "Structured Address Fields",
    summary: "Changed home address entry into separate street, city, state, and ZIP fields and improved address handling.",
  },
  {
    commit: "a8a4fa8",
    title: "Rank Dropdown Standardization",
    summary: "Replaced freeform rank entry with a fixed Air Force rank dropdown in signup and Account Settings.",
  },
  {
    commit: "8db91be",
    title: "Account Gating",
    summary: "Locked incomplete accounts into required setup and disabled ride and driver features until the needed profile info is finished.",
  },
  {
    commit: "bb931b9",
    title: "Optional Signup Setup Fields",
    summary: "Let users add home address, profile photo, and vehicle details during signup instead of only later.",
  },
  {
    commit: "3fa038c",
    title: "Signup Guidance Cleanup",
    summary: "Refined the signup wording for required versus later information and improved the profile photo guidance.",
  },
  {
    commit: "b74ddbd",
    title: "Ride and Driver Readiness Rules",
    summary: "Enforced the must-have account information for requesting rides and driving, and added readiness messaging.",
  },
  {
    commit: "4eb3efd",
    title: "Icon Revert",
    summary: "Reverted the app icon back to the previous logo after testing a replacement.",
  },
  {
    commit: "4f1646b",
    title: "New Icon Test",
    summary: "Swapped the app favicon and install icon to a newer uploaded logo before later reverting it.",
  },
  {
    commit: "5b43edd",
    title: "History Move and Bigger CTA",
    summary: "Moved ride history links into Account Settings and made Request Ride the bigger main homepage action.",
  },
  {
    commit: "bbdd5ce",
    title: "Notification Flash and Duplicate Fix",
    summary: "Stopped the notification setup card from flashing during load and reduced duplicate driver notification issues.",
  },
  {
    commit: "95b5838",
    title: "Feedback Utility Links",
    summary: "Added the bottom utility links for bug reports and suggestions.",
  },
  {
    commit: "7d18280",
    title: "Loading Props Compatibility",
    summary: "Fixed the simplified loading component so older title and caption props would still work.",
  },
  {
    commit: "7e43bdb",
    title: "Minimal Bomber Loader",
    summary: "Simplified the loading screens down to a black spinning bomber silhouette and Loading text.",
  },
  {
    commit: "4f43fe1",
    title: "Spinning Bomber Loader",
    summary: "Changed the loaders to use a spinning bomber silhouette instead of the full image with borders.",
  },
  {
    commit: "7b81701",
    title: "Dev Page Back Links",
    summary: "Added dedicated back links from dev test pages to the main developer hub.",
  },
  {
    commit: "370508c",
    title: "Custom Loader Assets",
    summary: "Wired in custom art assets for the loading screen before later simplifying the design again.",
  },
  {
    commit: "fd893f5",
    title: "AFGSC Loader Crest",
    summary: "Swapped the loading screens over to the uploaded AFGSC crest artwork.",
  },
  {
    commit: "fb799ba",
    title: "Bomber Shape Loader Refinement",
    summary: "Adjusted the loading bomber silhouette to better match the intended B-2 shape.",
  },
  {
    commit: "21df13b",
    title: "Developer Vault PIN",
    summary: "Turned developer unlock into a PIN-style vault with a built-in keypad and a cleaner official look.",
  },
  {
    commit: "7eb1dbe",
    title: "Developer Tools Hub",
    summary: "Added a PIN-protected developer hub and moved in-progress features off the main homepage.",
  },
  {
    commit: "44d630b",
    title: "Loader Preview Pages",
    summary: "Added preview pages so the full and inline loading screens could be watched for longer.",
  },
  {
    commit: "2cc9f65",
    title: "Inline Loader Upgrade",
    summary: "Replaced plain loading text across the app with a reusable mission-style loading graphic.",
  },
  {
    commit: "c3a3a5c",
    title: "Mission Loading Screen",
    summary: "Added the first animated mission-style loading screen with a bomber theme.",
  },
  {
    commit: "91ff63a",
    title: "Home Icons Instead of Buttons",
    summary: "Replaced text-based Home buttons around the app with a smaller icon-based home link.",
  },
  {
    commit: "0cad30d",
    title: "Chat Name Format Fix",
    summary: "Adjusted chat name formatting so it shows rank and last name correctly with the first initial and smaller flight text.",
  },
  {
    commit: "4eb7403",
    title: "Global Chat Access Fix",
    summary: "Fixed Firestore access so the global chat could actually read and write messages.",
  },
  {
    commit: "316d5dd",
    title: "Location Services Toggle",
    summary: "Added an account-level location services toggle that affects ride GPS use and driver location sharing.",
  },
  {
    commit: "24944f5",
    title: "Global Chat Launch",
    summary: "Added the first global chat page and a homepage shortcut to reach it.",
  },
  {
    commit: "00ef6bb",
    title: "Account Settings and Profile Access",
    summary: "Changed Account Details to Account Settings and moved access to it into the profile photo at the top right of the homepage.",
  },
  {
    commit: "5dbe8ca",
    title: "Notification Controls Move",
    summary: "Moved notification controls into Account Settings and hid the setup box once notifications were already enabled.",
  },
  {
    commit: "6fef363",
    title: "Notification Tools and ETA",
    summary: "Added notification test tools, a rider ETA, pickup display polish, and several driver and admin ride UI improvements.",
  },
  {
    commit: "5c0a4a4",
    title: "Install Name Set to 509 SFS",
    summary: "Changed the installed web app name shown on iPhone Home Screen to 509 SFS.",
  },
  {
    commit: "af0b32b",
    title: "Icon Update Test",
    summary: "Swapped app icons over to an uploaded replacement logo as a test.",
  },
  {
    commit: "fd2e662",
    title: "Pickup Validation Fix",
    summary: "Fixed a broken pickup validation reference after the GPS location-name changes.",
  },
  {
    commit: "960357f",
    title: "Friendly Pickup Names",
    summary: "Translated rider GPS coordinates into business names or readable addresses for drivers whenever possible.",
  },
  {
    commit: "5fca656",
    title: "Ride Lifecycle Helper",
    summary: "Added clearer ride lifecycle timestamps and timeline helpers across rider, driver, history, and admin screens.",
  },
  {
    commit: "962de46",
    title: "Single Account Photo",
    summary: "Simplified rider and driver profile pictures back into one shared account photo.",
  },
  {
    commit: "b0daecc",
    title: "Split Rider and Driver Photos",
    summary: "Temporarily separated rider and driver profile photo handling to clean up the account data model.",
  },
  {
    commit: "ff1f8e5",
    title: "Admin Manual Assignment",
    summary: "Added a manual ride assignment option on the admin dashboard so admins can dispatch open rides to drivers.",
  },
  {
    commit: "4f79f3a",
    title: "Foreground Notification Bridge",
    summary: "Improved foreground notification handling so rider updates could appear while the app was already open.",
  },
  {
    commit: "c38f8e6",
    title: "Rider Photo and Spacing Fix",
    summary: "Fixed rider photo syncing on the driver active ride page and adjusted the Active Ride heading spacing.",
  },
  {
    commit: "dbf89f8",
    title: "Active Ride Null Check Fix",
    summary: "Fixed a null safety issue on the driver active ride page that was breaking deployment.",
  },
  {
    commit: "4a4a61e",
    title: "Driver Active Ride Layout",
    summary: "Cleaned up the driver active ride layout with stronger button placement and a more focused rider info section.",
  },
  {
    commit: "58bcbdd",
    title: "Rider Update Notifications",
    summary: "Added rider notifications for ride accepted and driver arrived, including driver and vehicle details.",
  },
  {
    commit: "4ddfa57",
    title: "Safe Area Spacing",
    summary: "Adjusted the top safe-area spacing so titles would clear the iPhone notch better.",
  },
  {
    commit: "1e0628f",
    title: "iPhone Safe Area Background",
    summary: "Fixed white space around the iPhone notch and screen edges by extending the dark app background into the safe areas.",
  },
  {
    commit: "243c31e",
    title: "Defender Drivers Branding Pass",
    summary: "Renamed the app to Defender Drivers and updated version 32 branding, icon handling, and supporting text.",
  },
  {
    commit: "53259c7",
    title: "Notification Bridge Prerender Fix",
    summary: "Fixed a prerender issue caused by search params in the notification routing bridge.",
  },
  {
    commit: "bc4315a",
    title: "Notification Type Fix",
    summary: "Fixed a notification navigation typing error that was breaking the Vercel build.",
  },
  {
    commit: "4fcc7cd",
    title: "Squadron Logo App Icon",
    summary: "Switched the app icon over to the uploaded squadron logo and cleaned up the old icon setup.",
  },
  {
    commit: "d6efbcb",
    title: "Active Ride Locking",
    summary: "Locked the app flow during active rides so riders and drivers get funneled back to the correct live ride pages.",
  },
  {
    commit: "e54edd4",
    title: "Notification Click Routing",
    summary: "Improved notification click handling so tapping a notification opens the correct page more reliably.",
  },
  {
    commit: "1158ee2",
    title: "Notification Diagnostics",
    summary: "Added diagnostic tools for checking push token status and notification delivery issues.",
  },
  {
    commit: "a82560d",
    title: "iPhone Push Setup",
    summary: "Improved iPhone web-app setup for notifications with better install guidance and related metadata.",
  },
  {
    commit: "50de8d5",
    title: "Driver Push Setup",
    summary: "Improved the driver push notification setup so tokens save more reliably and the driver page can enable them too.",
  },
  {
    commit: "c18617a",
    title: "Favicon Update",
    summary: "Updated the favicon to match the app branding.",
  },
  {
    commit: "eb345e2",
    title: "Firebase Web Push",
    summary: "Added Firebase web push notifications as the first notification system for the app.",
  },
  {
    commit: "6787f6e",
    title: "Rider Cancel Ride",
    summary: "Added the ability for riders to cancel a ride request from the ride status page.",
  },
  {
    commit: "39a1880",
    title: "Saved Home Address and Duplicate Guard",
    summary: "Added saved home address support and an early duplicate active-ride check for riders.",
  },
  {
    commit: "8d1bade",
    title: "Username or Email Login",
    summary: "Added login support with either a username or an email address.",
  },
  {
    commit: "56a1d2e",
    title: "Driver Details for Riders",
    summary: "Started showing the driver’s profile photo and vehicle details to riders.",
  },
  {
    commit: "8d620de",
    title: "Profile Photo Firestore Flow",
    summary: "Moved profile photo handling into a Firestore-friendly saved-data flow.",
  },
  {
    commit: "3898692",
    title: "Gallery Photo Upload",
    summary: "Added profile photo upload from a device gallery.",
  },
  {
    commit: "81add19",
    title: "Account Details Page",
    summary: "Added the first account details page for user profile editing.",
  },
  {
    commit: "2a48ba6",
    title: "Rider Status UI Polish",
    summary: "Made the rider status page more prominent and easier to tap on mobile.",
  },
  {
    commit: "a3d504f",
    title: "Dark Theme Contrast Fixes",
    summary: "Improved dark theme contrast across rider and driver pages.",
  },
  {
    commit: "9a05054",
    title: "Admin Card Contrast",
    summary: "Fixed admin card contrast issues in the dark theme.",
  },
  {
    commit: "368d0d8",
    title: "Driver Active Ride Vercel Fix",
    summary: "Fixed a null safety build issue on the driver active ride page.",
  },
  {
    commit: "a89e8d4",
    title: "Font Deployment Fix",
    summary: "Removed a problematic Google font dependency to stabilize deployment before later reworking typography again.",
  },
  {
    commit: "5f09fde",
    title: "Dark Theme Polish",
    summary: "Polished the dark theme and typography across the app.",
  },
  {
    commit: "f1c1150",
    title: "Rules, Dispatcher Controls, and History",
    summary: "Added early security rules, dispatcher controls, and ride history features.",
  },
  {
    commit: "c741968",
    title: "Shared Live Maps",
    summary: "Added shared live maps and improved driver navigation handling.",
  },
  {
    commit: "5b01ed1",
    title: "OpenStreetMap Tracker",
    summary: "Moved the live rider map over to a real OpenStreetMap-based view.",
  },
  {
    commit: "8391d64",
    title: "Rider Live Map",
    summary: "Added a live tracker map for riders.",
  },
  {
    commit: "5f0e93a",
    title: "Rider Live Status Page",
    summary: "Added the first rider live ride status page.",
  },
  {
    commit: "7abfec2",
    title: "Arrived and Picked Up Stages",
    summary: "Added more detailed ride stages so the flow could track arrived and picked up separately.",
  },
  {
    commit: "037da02",
    title: "Change Description Update",
    summary: "Added a descriptive follow-up update note early in the project history.",
  },
  {
    commit: "76626f6",
    title: "Initial Commit",
    summary: "Created the first version of the app project.",
  },
];
