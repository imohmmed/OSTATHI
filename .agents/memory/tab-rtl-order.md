---
name: Tab bar RTL order
description: How tabs are ordered in ClassicTabLayout and NativeTabs to render correctly in Arabic RTL
---

## Rule
In `ClassicTabLayout`, tabs MUST be defined in reverse order so that when the OS flips them for RTL, الرئيسية ends up on the right (the natural start in Arabic reading).

Definition order: `[students, settings, chat, courses, index]`

This produces the visual left→right order on screen:
- Teacher: طلابي | التواصل | كورساتي | الرئيسية
- Student: الإعدادات | التواصل | كورساتي | الرئيسية

Arabic reading (right to left): الرئيسية | كورساتي | التواصل | طلابي/الإعدادات ✓

## For NativeTabs (iOS 26+)
Define in natural order [index, courses, chat, students/settings] — UITabBar does its own RTL reversal.

**Why:** Expo Router's `<Tabs>` on React Native uses `flexDirection: 'row-reverse'` under the hood when RTL is active. Defining tabs left-to-right would put الرئيسية on the left.

**How to apply:** Any new tab added to the bar must be inserted at the correct reversed position relative to where it should appear visually in RTL.
