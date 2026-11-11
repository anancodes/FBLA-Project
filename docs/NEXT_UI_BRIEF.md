# Queued interface changes

This records the owner's requested next pass. Finish Impeccable initialization first; wait for the owner's instruction to begin the interface work. None of the changes below are implemented by initialization.

Use the repository's Impeccable and frontend-design skills. Inspect the current application, preserve its vanilla HTML/CSS/JavaScript stack and useful behavior, and verify mobile and keyboard use. The owner wants fewer unnecessary containers and a more natural, integrated page layout.

## Volunteer home

- Remove the Events attended statistic and rebalance the page.
- Remove the home announcement section and reminder banner.
- Keep Your next shifts and Recommended for you.

## Opportunities and account creation

- Replace ZIP-only discovery with a specific-location approach.
- Optionally prompt for a location when an account is created.
- If a user skips location, do not expose location-based filtering. Let that person find opportunities manually through search.
- Clarify the intended location granularity before choosing an address, city/place, or geolocation implementation. Do not infer consent to collect a precise location.
- Clarify whether users without a location should see initial results or must enter a search before results appear.

## My schedule / My shifts

- Replace the fully expanded History section with a collapsed dropdown/disclosure.
- Show a compact preview of the last three attended events, with details available on expansion.

## Hours and clubs

- Apply the same compact/expandable approach to the chart on My hours. Clarify whether "last three" means the last three events or chart periods.
- Remove the certificate, copy, and print actions from My hours.
- Put the optional Download CSV action in a … menu.
- Preserve the useful parts of the existing Clubs view.
- Remove the separate Manage clubs navigation entry and club check-in entry.
- Merge the confusing Club admin experience into Hours & clubs, preserving appropriate member, officer, and adviser access. Removing a navigation entry should not silently erase required club-management capabilities.

## Other interface areas

- Reformat Inbox to improve readability and hierarchy.
- Remove Settings if it has no meaningful information or action for the current user. Preserve actual organization settings where applicable.
- Explore merging People and Clubs. Clarify how this should work for coordinator and site-admin roles.
- Review both role interfaces for unnecessary cards, wrappers, borders, and duplicated information. Prefer layouts that feel integrated with the page and clearly express the task.

The role-specific merge boundaries and open points above should be resolved when the owner starts this work, rather than guessed during product-context initialization.
