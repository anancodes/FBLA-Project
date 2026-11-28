# VolunteerHub competition review

**Live website before changes: 77/100. Implemented branch estimate: 97/100.** The official rating sheet totals **110**. Ten rows worth **70 points** can be reviewed from the program and its accompanying technical evidence. The remaining **40 points** depend on what competitors do before and during the presentation. The two website scores are the rounded results of 54 ÷ 70 and 68 ÷ 70. The two retained branch points reflect the reviewer’s confidence pending first-use observation and live email confirmation. A judge assigns the official points. [FBLA 2026–27 Coding & Programming guidelines, pp. 8–9](https://greektrack-fbla-public.s3.us-east-1.amazonaws.com/files/1/High%20School%20Competitive%20Events%20Resources/Individual%20Guidelines/Presentation%20Events/Coding-and-Programming.pdf)

The baseline was the public GitHub Pages site on November 27, 2026. Both demo roles were opened in desktop and phone-sized Chromium. The initial checkout was `fabadba`. The candidate incorporates the repository's later public landing and accessibility work at `2b4c484`, then adds this branch's color system, alert workflow and reporting changes. [Original public site](https://anancodes.github.io/FBLA-Project/volunteerhub-web/vh-web/)

## Evidence by scoring row

| Criterion, paraphrased | Max | Live | Branch | What accounts for the score |
|---|---:|---:|---:|---|
| Technology choice | 5 | 2 | 5 | The baseline named its stack. The README now explains why static JavaScript fits Pages and offline use, and why scheduled delivery needs a trusted service. |
| Readable code and comments | 5 | 4 | 5 | Both versions document view responsibilities. The new code also explains calendar-day math, draft ownership, retry behavior and uncertain outcomes where each decision occurs. |
| Modularity and programming | 10 | 8 | 10 | Browser views, validation and storage were already separate. The UI and worker now share term math and message text, and the mail transport can be tested independently. |
| Journey, design rationale and access | 10 | 6 | 9 | The live sign-in split devoted half the desktop to introductory prose. The new entry offers both sample roles, preserves keyboard focus and pairs colors with dates, labels and amounts. Direct usability observation with students and advisers remains open. |
| Ease of use and instructions | 5 | 4 | 5 | Both roles had help and a tour. The new screens explain verified versus pending hours, identify who receives alerts, show a real preview and validate the threshold inline. |
| Navigation and intelligent assistance | 5 | 4 | 5 | Original skill recommendations and filters already helped match shifts. Direct page links, history, meaningful empty states and term-aware guidance now support the whole workflow. |
| Input validation | 5 | 4 | 5 | Existing checks cover format and many scheduling errors. The candidate also checks a threshold against its actual goal, rejects invalid stored policy, and waits for confirmation on live policy changes. |
| Coverage of nonprofit volunteer management | 10 | 9 | 9 | Recruitment, scheduling, participation records and reporting work through both roles. The branch adds automatic two-recipient follow-up. Live inbox delivery still needs owner-authorized deployment and verification. |
| Customizable analytical output | 10 | 8 | 10 | The live coordinator already had grouping and CSV. The older volunteer chart omitted approved outside hours. The branch reconciles the ledger, monthly totals and CSV, and lets coordinators include approved outside records without counting them as attended shifts. |
| Data structures and storage | 5 | 5 | 5 | Persistent browser data and Firestore already served distinct needs. Indexed term totals, a per-member delivery record and atomic writes extend that model. |
| **Assessable total** | **70** | **54** | **68** | **77/100 → 97/100 on the website scale.** |

## Plan toward full marks and execution

| Action | Implemented evidence | Completion check |
|---|---|---|
| Make each audience's starting point obvious | Role selection during registration, one garden image, prominent sign-in, clear entry to volunteer and coordinator tasks | Open both roles from the public entry and return using browser history. |
| Give color an operational meaning | Forest actions and navigation, sky schedule dates, violet verified hours, warm alert surfaces and labeled pace states | Check phone and desktop, both themes, enlarged text, visible focus and keyboard dialogs. |
| Close the hours feedback loop | An adviser sets the threshold, a member sees their pace, and the daily job addresses the volunteer and adviser | Exercise equality, a near miss, pending hours, out-of-term work, incomplete recipients, recovery, repeats and interrupted Gmail calls. |
| Make numbers reproducible | A single ledger feeds volunteer monthly totals and CSV. Coordinator reports add outside hours on request | Compare the monthly sum and CSV with the verified total, then switch report grouping and check that the grand total holds. |
| Make the solution explainable and portable | Stack rationale, source and font credits, deployment guide, automated checks and single-file offline demo | Open the sample roles with external services blocked. Review the worker and preview the exact email text from a club. |
| Close the two remaining evidence gaps | Conduct a first-use task observation and deliver one staging alert to two consenting accounts | An unfamiliar volunteer finds a shift and explains their pace, an adviser changes the threshold unaided, and both test inboxes confirm one notification across two job runs. These checks require participants and account authorization. |

## Verification

The automated suites cover 59 browser and location checks, seven pace and Gmail delivery checks, and 12 Firestore rules and backend integration checks. The scheduled function was invoked twice against a local Firestore emulator and a simulated Gmail endpoint. The first run produced a message addressed to both recipients. The second produced no additional message. The single-file demo also opened both roles, downloaded a CSV and previewed an alert with zero external requests. [Test instructions](../tests/README.md)

## What the other 40 points require

| Event-day row | Points | Evidence the judges need |
|---|---:|---|
| Organization and clarity | 10 | The competitors deliver a coherent sequence within the presentation period. |
| Presence and delivery | 10 | Judges observe the team's confidence, body language, eye contact and voice. |
| Responses to questions | 10 | Competitors explain their own implementation and answer follow-up questions. |
| Event procedures | 10 | Judges observe the setup, permitted equipment and materials, and conduct for the round. |

The national timing is three minutes for setup, seven for the presentation and three for questions. The guideline assigns preparation and presentation responsibilities to registered competitors. Rehearsal, delivery and compliance remain with the team. [FBLA event requirements and rating sheet](https://greektrack-fbla-public.s3.us-east-1.amazonaws.com/files/1/High%20School%20Competitive%20Events%20Resources/Individual%20Guidelines/Presentation%20Events/Coding-and-Programming.pdf)
