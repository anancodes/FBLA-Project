# Queued interface changes

This records the owner's requested interface pass. After initialization, the owner instructed work to continue. The changes are implemented on `codex/interface-cleanup`; see [UI_CLEANUP.md](UI_CLEANUP.md) for decisions and verification.

Use the repository's Impeccable and frontend-design skills. Inspect the current application, preserve its vanilla HTML/CSS/JavaScript stack and useful behavior, and verify mobile and keyboard use. The owner wants fewer unnecessary containers and a more natural, integrated page layout.

## Volunteer home

- Remove the Events attended statistic and rebalance the page.
- Remove the home announcement section and reminder banner.
- Keep Your next shifts and Recommended for you.

## Opportunities and account creation

- Replace ZIP-only discovery with a specific-location approach.
- Optionally prompt for a location when an account is created.
- If a user skips location, do not expose location-based filtering. Let that person find opportunities manually through search.
- Confirmed: optional city or town, with state suggestions. No street address or device geolocation.
- Users without a saved location enter a keyword or choose a cause and submit Search before results appear.

## My schedule / My shifts

- Replace the fully expanded History section with a collapsed dropdown/disclosure.
- Show a compact preview of the last three attended events, with details available on expansion.

## Hours and clubs

- Apply the same compact/expandable approach to the chart on My hours. Confirmed by the owner: the last three attended events.
- Remove the certificate, copy, and print actions from My hours.
- Put the optional Download CSV action in a … menu.
- Preserve the useful parts of the existing Clubs view.
- Remove the separate Manage clubs navigation entry and club check-in entry.
- Merge the confusing Club admin experience into Hours & clubs, preserving appropriate member, officer, and adviser access. Removing a navigation entry should not silently erase required club-management capabilities.

## Other interface areas

- Reformat Inbox to improve readability and hierarchy.
- Remove Settings if it has no meaningful information or action for the current user. Preserve actual organization settings where applicable.
- Explore merging People and Clubs. Implemented as one coordinator People & clubs section with Volunteers, Clubs, and admin-only Organizers.
- Review both role interfaces for unnecessary cards, wrappers, borders, and duplicated information. Prefer layouts that feel integrated with the page and clearly express the task.

The student-side club administration tools are embedded in My clubs within Hours & clubs. Coordinator attendance remains under Events; the student-side club check-in entry is removed.
