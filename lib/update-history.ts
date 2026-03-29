export type UpdateHistoryEntry = {
  commit: string;
  title: string;
  summary: string;
};

// Newest first. Add each new shipped update to the top of this list.
export const UPDATE_HISTORY: UpdateHistoryEntry[] = [
  {
    commit: "v273",
    title: "Inbox Read-On-Open Narrowing",
    summary: "Changed inbox threads so posts only get marked read when the user actually expands that specific message, instead of clearing just from opening the inbox thread page.",
  },
  {
    commit: "v272",
    title: "Homepage Applications Status Line",
    summary: "Added a small applications uplink status readout beside the Applications header on the homepage that shows operational apps versus total visible apps.",
  },
  {
    commit: "v271",
    title: "Inbox Response-Required Unread Fix",
    summary: "Adjusted inbox thread unread styling so messages that still require a response stay marked unread until the response is actually submitted, even if the thread has already been opened.",
  },
  {
    commit: "v270",
    title: "Inbox Unread Marker Sync Fix",
    summary: "Fixed inbox thread unread indicators so the red unread badges and styling clear immediately once a thread is opened and marked read, instead of lingering until a later refresh.",
  },
  {
    commit: "v269",
    title: "Event Attendance Copy Trim",
    summary: "Removed the extra helper sentence from the event detail attendance roster card to keep that section tighter and less repetitive.",
  },
  {
    commit: "v268",
    title: "Shared Panel Motion Pass",
    summary: "Applied the smoother dropdown-style open and close motion to the app’s main expandable panels, including the Events filter, account delete form, rider and driver timelines, admin account detail expansion, and inbox message expansion.",
  },
  {
    commit: "v267",
    title: "Events Filter Motion Polish",
    summary: "Made the main Events Filter label slightly larger and added a smoother open/close transition to the collapsible filter panel so it expands more like the existing profile dropdown behavior.",
  },
  {
    commit: "v266",
    title: "Emergency Ride Pulse Boost",
    summary: "Increased the emergency ride button’s color and glow pulse slightly so it reads more clearly while still keeping the button physically still with no size animation.",
  },
  {
    commit: "v265",
    title: "Event Scheduling Copy Trim",
    summary: "Simplified the add-event Scheduling section so it now shows just the Scheduling title and the Schedule Type control without the extra explanatory text between them.",
  },
  {
    commit: "v264",
    title: "Collapsible Events Filter Panel",
    summary: "Reworked the main Events filter box into a collapsible Filter panel with a right-side plus/minus toggle, keeping the controls tucked away until expanded.",
  },
  {
    commit: "v263",
    title: "Event Form Status Box Cleanup",
    summary: "Stopped event photo cropper messages from feeding into the bottom-of-page status panel on the add-event screen, so image-ready notices stay with the uploader instead of showing up in a separate box at the bottom.",
  },
  {
    commit: "v262",
    title: "Event Form Description Header Trim",
    summary: "Simplified the add-event form so that section now just says Description and no longer shows the extra helper sentence underneath it.",
  },
  {
    commit: "v261",
    title: "Event Attendance Sign-Up",
    summary: "Added an I’ll Attend RSVP action to event detail pages along with a live attendee roster that shows each attendee’s profile photo and formatted rank/last-name label, and deployed the matching Firestore rules for event attendance records.",
  },
  {
    commit: "v260",
    title: "Event Card Duplicate Info Cleanup",
    summary: "Removed the duplicate When and Where lines from the Events board cards so those cards now rely on the cleaner info bubbles for schedule and location.",
  },
  {
    commit: "v259",
    title: "Events Filter Copy Cleanup",
    summary: "Removed the extra sentence from the Upcoming Events filter panel so the top of the Events board stays more compact.",
  },
  {
    commit: "v258",
    title: "Events Header Copy Trim",
    summary: "Removed the extra helper sentence under the Events title and dropped the sorted-nearest-first status pill so the page header stays cleaner.",
  },
  {
    commit: "v257",
    title: "Signup Photo Helper Cleanup",
    summary: "Removed the extra standalone profile-photo-required sentence from the account creation page while leaving the actual required-photo behavior and uploader helper text in place.",
  },
  {
    commit: "v256",
    title: "Event Card Action Placement",
    summary: "Moved the event-card View Details callout into the top-right corner of each Events board card so the action sits more cleanly against the title block.",
  },
  {
    commit: "v255",
    title: "Event Banner Ratio Update",
    summary: "Switched event photos back to a top-of-card banner layout with a consistent 2:1 landscape ratio, and upgraded the shared image cropper so event uploads show that same wide crop frame while the user is positioning the image.",
  },
  {
    commit: "v254",
    title: "Event Card Square Photo Lock",
    summary: "Locked the event-board card photo shell to a consistent square format so every event card keeps the same left-image footprint regardless of the uploaded image shape.",
  },
  {
    commit: "v253",
    title: "Event Card Info Refresh",
    summary: "Updated the main Events board cards so they keep the type tag at the top, use a smaller left-side photo, show the organizer as a POC line, keep when/where visible, and clamp the description to a shorter two-line preview.",
  },
  {
    commit: "v252",
    title: "Messages Moved To Dev",
    summary: "Removed the Messages app from the main homepage dashboard for now and added a temporary Messages entry on the developer tools page so the feature stays accessible while we work on it later.",
  },
  {
    commit: "v251",
    title: "Events Experience Polish",
    summary: "Polished the Events board, event detail view, and add-event flow with clearer hierarchy, stronger schedule/meta presentation, better filter controls, improved empty states, and a cleaner mobile-friendly creation form.",
  },
  {
    commit: "v250",
    title: "Developer Terminal Layout Polish",
    summary: "Refactored the developer access terminal into a cleaner mobile-first anti-tamper panel with better spacing, clearer visual hierarchy, stronger keypad focus, and no overlapping header/status elements.",
  },
  {
    commit: "v249",
    title: "Homepage Console Typing Expansion",
    summary: "Slowed the homepage cosmetic status-console typing, upgraded it into a command-and-response log, and added more dynamic unpredictable outputs including easter-egg operation strings in the same tactical console format.",
  },
  {
    commit: "v248",
    title: "Developer Vault Theme Overhaul",
    summary: "Restyled the developer PIN pad into a more intense military-tech anti-tamper device with heavier metal framing, exposed cable accents, warning hardware, and a bomb-disarm style control panel.",
  },
  {
    commit: "v247",
    title: "Developer Loader Test Correction",
    summary: "Fixed the developer loader test so it now replays the real first-open vault-door splash instead of the simpler minimal loading screen.",
  },
  {
    commit: "v246",
    title: "Explosion Fade Smoothing",
    summary: "Smoothed the end of the developer self-destruct explosion so the home screen no longer fades and then abruptly snaps back when the overlay finishes.",
  },
  {
    commit: "v245",
    title: "Signup Photo Placement Cleanup",
    summary: "Moved the required profile-photo upload to sit directly under Verify Password so the optional address and vehicle fields stay grouped together below it.",
  },
  {
    commit: "v244",
    title: "Developer Loader Test Button",
    summary: "Added a developer-only button that replays the full initial app loading screen and then returns straight to the Developer page for faster loader testing.",
  },
  {
    commit: "v243",
    title: "Developer PIN Alert Tuning",
    summary: "Changed the developer unlock display so incorrect PIN feedback turns the screen red, neutral standby stays non-green until validation starts, and the self-destruct countdown now runs for 3 seconds.",
  },
  {
    commit: "v242",
    title: "Account Deletion Cleanup Framework",
    summary: "Added shared account-deletion cleanup so self-deletes and admin deletes now remove owned records like events, bug reports, suggestions, inbox posts, and chat messages while intentionally preserving ride history data.",
  },
  {
    commit: "v241",
    title: "Developer Inbox Consolidation",
    summary: "Moved the developer inbox tools out of the main Developer page into one Dev Inbox button, with a dedicated send page and a separate sent-message management page for editing or deleting posts.",
  },
  {
    commit: "v240",
    title: "Signup Phone Confirmation",
    summary: "Added a verify-phone field during account creation so users must enter their phone number twice before moving forward.",
  },
  {
    commit: "v239",
    title: "Permissions Copy Cleanup",
    summary: "Removed the extra helper sentence under App Permissions in account settings so that section stays cleaner.",
  },
  {
    commit: "v238",
    title: "Security Copy Cleanup",
    summary: "Removed the extra password-update helper sentence from the Security section in account settings to keep that area cleaner.",
  },
  {
    commit: "v237",
    title: "Developer Tool Cleanup",
    summary: "Removed the Full Loader preview, Inline Loader preview, and Driving Simulator from the Developer page and deleted their associated routes/files so the developer area stays focused on the tools still in use.",
  },
  {
    commit: "v236",
    title: "Delete Account Copy Trim",
    summary: "Removed the extra permanent-deletion helper sentence from the Account Settings delete-account section so that area stays cleaner while keeping the same verification flow.",
  },
  {
    commit: "v235",
    title: "Upcoming Event Ordering and Recurring Dates",
    summary: "Adjusted the main Events board to sort by the nearest real upcoming occurrence, changed recurring event cards to show only the next upcoming date in the series, and expanded recurring event detail pages to list the recurring schedule plus the next three upcoming dates.",
  },
  {
    commit: "v234",
    title: "Event End Date Clear Fix",
    summary: "Added explicit Clear controls beside the optional event end-date fields so Safari and iPhone users can reliably remove end dates even when the native date-picker reset action does not clear the controlled input.",
  },
  {
    commit: "v233",
    title: "Monthly Event Recurrence",
    summary: "Expanded recurring event creation with a monthly cadence that supports first-through-fifth weekday patterns, so events can now be scheduled in formats like every third Monday while keeping one-time dates separate from recurring setup.",
  },
  {
    commit: "v232",
    title: "Event Description Placeholder Update",
    summary: "Updated the Add Event description field placeholder so it now calls out additional event details like required gear, uniform, and other important notes more directly.",
  },
  {
    commit: "v231",
    title: "Official Event Type",
    summary: "Added Official as a first-class event type so it now appears alongside the other event categories throughout the event creator, filters, and shared event labeling.",
  },
  {
    commit: "v230",
    title: "Organizational Event Type",
    summary: "Added Organizational as a first-class event type so it now appears in the event creator, filtering controls, and shared event labeling across the Events pages.",
  },
  {
    commit: "v229",
    title: "Event Photo Fullscreen Viewer",
    summary: "Made event detail photos open in the same fullscreen image viewer used elsewhere in the app so event images can be tapped and expanded instead of staying fixed to the page.",
  },
  {
    commit: "v228",
    title: "Optional Event Address Field",
    summary: "Added an optional address field under the Location input in the Events creator and carried it through to saved event data so event cards and detail pages can show a more precise address when one is provided.",
  },
  {
    commit: "v227",
    title: "Flexible Recurring Event Scheduling",
    summary: "Expanded the Events creator so recurring schedules stay separate from one-time date blocks and now support selecting multiple weekdays plus every-week or every-other-week cadence for patterns like every Tuesday and Thursday or every other Wednesday.",
  },
  {
    commit: "v226",
    title: "Photo Crop Aspect Fix",
    summary: "Updated the shared photo cropper so non-square uploads keep their natural proportions inside the crop window, with the extra width or height hanging off the viewport and remaining available through panning instead of appearing squeezed into a square.",
  },
  {
    commit: "v225",
    title: "Desktop Dropdown Contrast Fix",
    summary: "Fixed the app's shared dropdown styling so desktop select option menus now use the same dark theme as the rest of the interface instead of opening with unreadable white backgrounds.",
  },
  {
    commit: "v224",
    title: "Verified Account Deletion",
    summary: "Added a red-tinted delete-account action under Account Settings that requires the current vehicle year, make, model, color, and the account password before permanently deleting the member's auth account, profile, and username record.",
  },
  {
    commit: "v223",
    title: "Events App First Pass",
    summary: "Replaced the Events placeholder with a real events board that supports browsing upcoming event cards, filtering by type and date, opening event detail pages, and creating new events with multi-date or recurring schedules, photo upload, description, location, and optional headcount fields.",
  },
  {
    commit: "v222",
    title: "Emergency Pulse Smoothing",
    summary: "Smoothed the homepage emergency ride pulse so it now eases through a soft red brightness and glow shift instead of abruptly flipping between red shades.",
  },
  {
    commit: "v221",
    title: "Inbox Button Height Tightening",
    summary: "Further reduced the vertical height and padding of the Return to Inbox and Open Inbox buttons so the single-line label fits more comfortably without the extra empty space above and below it.",
  },
  {
    commit: "v220",
    title: "Emergency Button Color Pulse",
    summary: "Changed the homepage emergency ride pulse from a size animation to a very slight red color and glow shift so the button stays physically still while still drawing subtle attention.",
  },
  {
    commit: "v219",
    title: "Inbox Return Button Size Trim",
    summary: "Reduced the size of the inbox Return to Inbox and Open Inbox navigation buttons so they feel less bulky next to the home icon while keeping the same blue gradient theme.",
  },
  {
    commit: "v218",
    title: "Home Button Style Match",
    summary: "Matched the top-left home button across the app to the same darker round style used by the persistent bottom-left home button and removed the inbox-only green override so both home controls now look identical.",
  },
  {
    commit: "v217",
    title: "Driver Active Ride Redirect Fix",
    summary: "Changed the driver active-ride screen so if the ride is no longer valid for that driver after a release or status change, the page now redirects straight back to the driver dashboard instead of leaving the driver on an empty unavailable screen.",
  },
  {
    commit: "v216",
    title: "Emergency Ride GPS Guardrail",
    summary: "Stopped one-tap emergency rides from going out without a captured live location, and added a rider-status safety cleanup that auto-cancels any emergency ride missing rider GPS before sending the rider back home to retry the request properly.",
  },
  {
    commit: "v215",
    title: "Inbox Button Theme Correction",
    summary: "Restored the inbox Return to Inbox and Open Inbox navigation buttons to the same blue gradient action style used across the rest of the app so those controls no longer feel visually off-theme.",
  },
  {
    commit: "v214",
    title: "Driver Release Reason Prompt",
    summary: "Made drivers enter a release reason immediately before sending an active ride back to the queue, and stored that reason with the release handling instead of relying on a later follow-up response.",
  },
  {
    commit: "v213",
    title: "Emergency Ride Button Pulse",
    summary: "Added a very slight pulse animation to the homepage emergency ride request button while it is idle so the primary action draws attention without feeling flashy or distracting.",
  },
  {
    commit: "v212",
    title: "Signup Profile Photo Requirement",
    summary: "Made the profile photo mandatory during account creation by blocking signup until a photo is uploaded and updating the signup form copy so that requirement is clear before the account is submitted.",
  },
  {
    commit: "v211",
    title: "Inbox Unread Message Badges",
    summary: "Added per-message unread badges inside inbox threads based on what was new before the thread was opened, and restyled the inbox navigation actions so the Return to Inbox and top-left Home controls match the app’s themed button treatment.",
  },
  {
    commit: "v210",
    title: "Homepage Null Status Messaging",
    summary: "Replaced the homepage ride-request and unavailable driver-dashboard warning copy with compact NULL status strings based on the exact missing profile requirements, and removed the extra helper and red instruction text beneath those unavailable states.",
  },
  {
    commit: "v209",
    title: "Signup Phone Verification Removal",
    summary: "Removed the SMS phone-verification step from account creation across the signup permissions flow and signup finalizer, so new accounts can be created directly after accepting permissions while still keeping entered signup details saved when navigating back.",
  },
  {
    commit: "v208",
    title: "Signup Draft Persistence and Phone Auth Errors",
    summary: "Kept account-creation details saved when backing out of the permissions and phone-verification step by reloading the stored signup draft into the form, and replaced vague Firebase phone-auth failures with clearer messages when the app domain is not authorized or phone sign-in is disabled.",
  },
  {
    commit: "v207",
    title: "Signup Phone Verification",
    summary: "Inserted SMS phone verification into the signup flow after the app-permissions step so new users must request and enter a texted code before the account is created, while existing accounts remain grandfathered and unaffected.",
  },
  {
    commit: "v206",
    title: "Driver Icon Refresh",
    summary: "Replaced the Driver Dashboard tile icon with a cleaner modern steering wheel SVG using a single outer rim, centered hub, and three balanced spokes so it reads more like a standard UI vehicle-control icon.",
  },
  {
    commit: "v205",
    title: "Events App Placeholder",
    summary: "Added a new EVENTS app tile to the homepage with a custom calendar-and-people icon and wired it to a live placeholder page so the events section now has a real entry point for future scheduling features.",
  },
  {
    commit: "v204",
    title: "Compact Profile Header Module",
    summary: "Trimmed down the homepage profile asset box so it takes less horizontal space in the header, while keeping the profile photo size intact and ensuring the Defender One title stays on one line with the status tag wrapping separately when needed.",
  },
  {
    commit: "v203",
    title: "Background Grayscale Shift",
    summary: "Removed the remaining olive-green tint from the shared app background by shifting the base glow and grid layers fully into neutral grayscale tones while keeping the same overall background structure.",
  },
  {
    commit: "v202",
    title: "Background Grid Alignment Fix",
    summary: "Cleaned up the shared background grid so the line spacing stays visually even across the app by switching to a fixed-size centered grid layer and removing the off-pattern accent bands that were making some gaps look wider than others.",
  },
  {
    commit: "v201",
    title: "Profile Frame Tone-Down",
    summary: "Retuned the homepage profile asset panel away from the green tint into a lower-key neutral slate frame with softer borders and shadows, while keeping the profile photo itself the same size.",
  },
  {
    commit: "v200",
    title: "Global Tactical Background Rollback",
    summary: "Reverted the root-level fixed tactical background and parallax system from v198 so the app returns to the earlier simpler global background treatment while keeping the newer homepage profile asset frame in place.",
  },
  {
    commit: "v199",
    title: "Homepage Profile Asset Frame",
    summary: "Wrapped the homepage profile photo and its asset-status label in a dedicated framed panel so the account module reads more clearly as a separate header element from the rest of the screen while keeping the same dropdown behavior.",
  },
  {
    commit: "v198",
    title: "Global Tactical Background System",
    summary: "Added a root-level fixed tactical background stack with a locked dark gradient base, subtle grid, topographic markings, grain, vignette, and a very light desktop-only parallax drift so every page now scrolls cleanly over one shared military-style backdrop.",
  },
  {
    commit: "v197",
    title: "Rollback to Pre-Green UI",
    summary: "Rolled the app back to the earlier pre-green interface state from the background simplification build after reviewing the newer green-focused visual passes, while keeping the shipped version number moving forward for release tracking.",
  },
  {
    commit: "v196",
    title: "Green Theme Consistency Pass",
    summary: "Finished the remaining blue-to-green cleanup across the app by swapping leftover buttons, login/admin links, ride controls, shared shells, live-map driver accents, inbox utilities, and footer-linked surfaces so the shipped interface now reads consistently green instead of partially blue.",
  },
  {
    commit: "v195",
    title: "Green Surface Tint Pass",
    summary: "Shifted the remaining blue-tinted translucent box backgrounds to muted green across the homepage applications area, app status console, profile dropdown, driver surfaces, ride panels, admin shells, inbox threads, and shared utility overlays so the main interface boxes feel more consistent with the tactical green palette.",
  },
  {
    commit: "v194",
    title: "Driver Tile Label Cleanup",
    summary: "Renamed the homepage Driver Dashboard app tile to just Driver so it aligns more cleanly with the other application labels in the top row.",
  },
  {
    commit: "v193",
    title: "Core Accent Green Shift",
    summary: "Started replacing the app's remaining blue text and border accents with muted green equivalents across the shared styles, homepage, ride flow pages, admin surfaces, inbox links, and primary developer pages so the overall interface reads less blue and more tactical.",
  },
  {
    commit: "v192",
    title: "Background Simplification Pass",
    summary: "Removed the contour-line and scratch/wear layers from the global tactical background so the app keeps the darker grid, grain, scanline, and vignette treatment without the weirder map-and-metal artifacts.",
  },
  {
    commit: "v191",
    title: "Global Tactical Background System",
    summary: "Rebuilt the app-wide background into a darker military terminal stack with a matte black-to-charcoal base, faint grid and contour overlays, static grain and scratch texture, a subtle vignette, scanlines, and a matching rugged splash-screen palette so the whole app feels like one consistent tactical system.",
  },
  {
    commit: "v190",
    title: "Terminal-Style App Status Console",
    summary: "Moved the homepage status monitor below the full Applications card and redesigned it as a small PowerShell-style console that types out rotating fake operational checks three lines at a time.",
  },
  {
    commit: "v189",
    title: "Applications Status Monitor",
    summary: "Added a cosmetic app status monitor under the homepage Applications section that cycles through three fake live operational check lines at a time to make the home screen feel more like an active command platform.",
  },
  {
    commit: "v188",
    title: "Homepage Title Underline",
    summary: "Added an underline to the Defender One title on the homepage so the app name stands out more clearly in the header block.",
  },
  {
    commit: "v187",
    title: "Animated Auth Status Light",
    summary: "Changed the homepage auth-token status light into a soft pulsing green indicator so it fades in and out like a live validated system signal instead of staying fully static.",
  },
  {
    commit: "v186",
    title: "Homepage App Status Header",
    summary: "Added an inline //APP_STATUS:READY tag beside the Defender One title and a smaller MOBILE_OPERATIONS_PLATFORM//FORM:APP line beneath it to make the homepage header read more like a live mission platform banner.",
  },
  {
    commit: "v185",
    title: "Emergency Ride Protocol Tag",
    summary: "Added a smaller protocol/auth status line under the main emergency ride request button text so the homepage call-to-action reads more like an immediate-response command control button.",
  },
  {
    commit: "v184",
    title: "Profile Asset Label Wrap Fix",
    summary: "Adjusted the homepage profile asset tag so it always breaks cleanly after ASSET_LOADED: and keeps the full PFP//0-1 value together on the second line on mobile.",
  },
  {
    commit: "v183",
    title: "Homepage Auth Strip Layout Fix",
    summary: "Moved the homepage validation status light to the front of the auth strip and reformatted the text into a clean two-line layout so it always breaks at USER: before the member's last name on mobile.",
  },
  {
    commit: "v182",
    title: "Profile Asset Status Tag",
    summary: "Added an ASSET_LOADED:PFP//0-1 status label directly under the top-right profile photo on the homepage so the corner account block reads more like a loaded system asset panel.",
  },
  {
    commit: "v181",
    title: "Validated User Status Light",
    summary: "Added a small green status light to the end of the homepage AUTH TOKEN VALIDATED user line so the header reads more like an active verified-status strip.",
  },
  {
    commit: "v180",
    title: "Homepage Auth Token Header",
    summary: "Added a signed-in homepage header line under the 509 SFS location banner that shows an AUTH TOKEN VALIDATED user tag using the current member's name and rank.",
  },
  {
    commit: "v179",
    title: "Account Profile Detail Fields",
    summary: "Added a one-line job description field under Flight and a three-line bio section under the profile photo area in Account Settings, and updated the backend profile rules so both fields save normally.",
  },
  {
    commit: "v178",
    title: "Ride Recovery Notifications",
    summary: "Added a private Notifications inbox thread for ride notices and required follow-up, created backend rider-cancel and driver-release recovery routes, repushed released rides back to available drivers, and required the canceling party to submit a reason through the new notification prompt.",
  },
  {
    commit: "v177",
    title: "Pickup Address Deduping",
    summary: "Updated the driver active ride pickup card so it only shows one line when the resolved pickup label and address are the same, while still showing a second line when there is a distinct place name and street address.",
  },
  {
    commit: "v176",
    title: "Driver Active Ride Cleanup",
    summary: "Removed redundant status and driver-location details from the driver active ride page, simplified the pickup guidance text, and moved the ride timeline into a collapsible section at the bottom of the screen.",
  },
  {
    commit: "v175",
    title: "Ride Photo Fullscreen Viewer",
    summary: "Made the profile photos on both the rider ride status page and the driver active ride page tappable so they can open in the same fullscreen image viewer with the top-left close button.",
  },
  {
    commit: "v174",
    title: "Ride Status Detail Cleanup",
    summary: "Moved the rider timeline into a collapsible section at the bottom of the ride status page and removed the redundant driver phone field plus the placeholder destination text when no real destination has been set yet.",
  },
  {
    commit: "v173",
    title: "Driver Dashboard Section Cleanup",
    summary: "Removed the Active Ride Assignments section from the driver dashboard so the page stays focused on availability and open requests before redirecting into the live ride screen.",
  },
  {
    commit: "v172",
    title: "Driver Dashboard Header Cleanup",
    summary: "Simplified the driver dashboard by removing the extra overview text, putting the driver profile photo beside the name, dropping the offline helper line, and removing the Active Rides stat box so the top section stays cleaner.",
  },
  {
    commit: "v171",
    title: "Operations Console Visual Refresh",
    summary: "Shifted the app toward a more military operations-console look with sharper typography, colder steel-and-slate surfaces, cleaner panel styling, and more consistent tactical button, tile, and dashboard treatment across the main user flows.",
  },
  {
    commit: "v169",
    title: "Ride Cancel Redirect Fix",
    summary: "Updated rider-side cancel behavior so a successful ride cancellation immediately returns the user to the home page instead of sometimes leaving them on the canceled ride screen while listeners catch up.",
  },
  {
    commit: "v168",
    title: "Account Settings Layout Cleanup",
    summary: "Reordered the Account Settings page into a cleaner flow, made phone and email display as fixed account info instead of editable fields, removed the unused profile photo URL box, and added a bottom-left Home button across the app.",
  },
  {
    commit: "v167",
    title: "Signup Flow Cleanup",
    summary: "Reordered the required signup fields, removed the old Required Now and Complete Now or Later framing, added stronger password rules, and made signup problems appear clearly under the Continue to Terms button before users can proceed.",
  },
  {
    commit: "v166",
    title: "Presentation Polish Pass",
    summary: "Cleaned up wording, empty states, labels, and section descriptions across the home page, inbox, rider ride status, driver dashboard, and admin dashboard so the app reads more professionally for leadership review.",
  },
  {
    commit: "v165",
    title: "Inbox Thread Unread Badges",
    summary: "Added separate unread badges for the Admin and Dev inbox channels and changed message posts to expand on tap, with the unread alert clearing only after a message is actually opened.",
  },
  {
    commit: "v164",
    title: "New Defender One Icon",
    summary: "Replaced the app icon, favicon, Apple icon, and install icon references with the new Defender One artwork and kept the installed web app name set to Defender One.",
  },
  {
    commit: "v163",
    title: "Cropper Zoom Render Fix",
    summary: "Changed the image cropper to zoom from a stable base render using transforms instead of resizing the image box directly, which should stop the profile photo cropper from feeling like it stretches vertically.",
  },
  {
    commit: "v162",
    title: "Photo Viewer Close Button",
    summary: "Replaced the fullscreen inbox photo viewer swipe-down instruction with a simple top-left close button so it does not encourage accidental pull-to-refresh behavior.",
  },
  {
    commit: "v161",
    title: "Photo Cropper Gesture Cleanup",
    summary: "Improved the new image cropper so it supports two-finger pinch zoom inside the photo area instead of feeling like a stretched slider-only control.",
  },
  {
    commit: "v160",
    title: "Inbox Media and Post Management",
    summary: "Removed the Notifications inbox channel, added Admin and Dev post review/edit/delete tools, added full-screen image viewing inside inbox messages, and upgraded profile/post photo uploads with zoom-and-pan cropping including a circular preview for profile pictures.",
  },
  {
    commit: "v159",
    title: "Inbox Post Backend Fix",
    summary: "Fixed the Firestore admin serializer so admin and dev inbox posts can save structured audit log details without failing on unsupported value type errors.",
  },
  {
    commit: "v158",
    title: "Home Badge Alerts",
    summary: "Added unread inbox badges to the home profile avatar and Inbox menu entry, plus a live Driver Dashboard badge that shows how many open ride requests a clocked-in driver can currently see.",
  },
  {
    commit: "v157",
    title: "Real Inbox Posting",
    summary: "Added real Admin and Dev inbox post composers with title, body, and optional photo uploads, and wired the Inbox threads to show live stored posts instead of placeholders.",
  },
  {
    commit: "v156",
    title: "App Permissions Test Ride",
    summary: "Added a safe test ride button in App Permissions that opens the normal rider status flow without notifying drivers, so permission prompts and ride behavior can be checked without disrupting operations.",
  },
  {
    commit: "v155",
    title: "App Permissions Toggle Cleanup",
    summary: "Moved the notification and location settings out of Account Settings into App Permissions and restyled them as iPhone-style on/off switches.",
  },
  {
    commit: "v154",
    title: "Flight Routing Expansion Hardening",
    summary: "Made the 5-minute emergency ride expansion check run from active driver dashboards too, so the wider fallback alert does not depend on the rider keeping their ride screen open.",
  },
  {
    commit: "v153",
    title: "Flight-Based Emergency Ride Routing",
    summary: "Added an App Permissions setting that can send emergency ride requests to the rider’s own flight first or to everyone except that flight first for 5 minutes before expanding to the rest of the active driver pool.",
  },
  {
    commit: "c7ec3fb",
    title: "Defender One Rebrand",
    summary: "Renamed the user-facing app branding to Defender One across the homepage, startup screen, install name, and notification fallback labels.",
  },
  {
    commit: "6d59171",
    title: "Timed Live Ride Tracking Return",
    summary: "Brought live ride tracking back in a lower-risk way with slower timed location updates and manual refresh buttons for both rider and driver, instead of constant location syncing.",
  },
  {
    commit: "6d8b743",
    title: "Backend Hardening and Audit Pass",
    summary: "Added stronger shared admin checks, cleaner notification logging, a new admin audit log view, and tighter ride update rules so the backend is safer and easier to trace without changing normal app flow.",
  },
  {
    commit: "0902f33",
    title: "Live GPS Sync Rollback",
    summary: "Turned off the continuous rider and driver Firestore location syncing so ride actions stop tripping quota errors and the ride system can return to stable behavior.",
  },
  {
    commit: "4030a5d",
    title: "Driver Accept Flow Quota Relief",
    summary: "Changed driver ride acceptance to lock the ride first and update the driver availability separately so a busy profile document cannot block the accept action.",
  },
  {
    commit: "93ba6e9",
    title: "Ride Refresh and Dispatch Reliability",
    summary: "Made the rider status page hold onto the requested ride across pull-to-refresh and changed ride-request notifications to finish sending before the app redirects away.",
  },
  {
    commit: "3d5e613",
    title: "Separate Live Ride Location Document",
    summary: "Moved rider and driver live GPS updates into their own Firestore document so constant map updates stop competing with ride actions like canceling, arriving, and pickup.",
  },
  {
    commit: "3a11e1e",
    title: "Mobile Pull-to-Refresh",
    summary: "Added a mobile pull-down refresh gesture across the app so when you drag down from the top of a page, it refreshes more like a normal phone browser.",
  },
  {
    commit: "6178386",
    title: "Pickup Navigation GPS Lock",
    summary: "Changed driver pickup navigation so when rider GPS is available, the maps app gets only the rider’s coordinates and not a readable pickup label that could override the pin.",
  },
  {
    commit: "594b482",
    title: "Live Location Write Throttling",
    summary: "Reduced and de-overlapped rider and driver live-location updates so ride actions like 'I'm Here' stop getting blocked by Firestore quota spikes.",
  },
  {
    commit: "03439a0",
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
