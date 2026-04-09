

# תוכנית: שמירת נתוני משתמשים במסד נתונים עם הרשאות ותפקיד אדמין

## סקירה
המערכת כיום שומרת את רוב המידע (תוצאות בידול, נתוני טפסים, הגדרות) ב-localStorage. התוכנית היא להעביר את המידע המרכזי למסד הנתונים עם RLS, ולהוסיף מערכת תפקידים (admin/user).

## שלבים

### 1. יצירת טבלת תפקידים (user_roles)
- יצירת enum `app_role` עם ערכים `admin`, `user`
- יצירת טבלת `user_roles` עם `user_id` ו-`role`
- יצירת פונקציית `has_role` (security definer) לבדיקת תפקיד
- הוספת RLS: כל משתמש יכול לקרוא את התפקיד שלו, רק אדמין יכול לשנות
- הכנסת שורת אדמין עבורך (לפי ה-user_id שלך)

### 2. יצירת טבלת נתוני בידול (differentiation_results)
- עמודות: `id`, `user_id`, `form_data` (jsonb), `result` (jsonb), `created_at`, `updated_at`
- RLS: משתמש רגיל רואה/עורך רק את שלו; אדמין רואה הכל

### 3. יצירת טבלת נתוני טפסים (user_form_data)
- עמודות: `id`, `user_id`, `form_type` (text), `data` (jsonb), `created_at`, `updated_at`
- שמירת נתוני MultiStepForm, הגדרות פרופיל, וכו׳
- RLS: אותו דפוס — משתמש רואה רק את שלו, אדמין רואה הכל

### 4. עדכון RLS בטבלאות קיימות
- הוספת מדיניות SELECT לאדמין בטבלאות `profiles` ו-`saved_plans` (כרגע רק הבעלים רואה)

### 5. עדכון קוד הצד-לקוח
- **DifferentiationWizard / Differentiate page**: שמירת תוצאות בידול ל-DB במקום localStorage
- **MultiStepForm / UserProfileContext**: שמירת נתוני טפסים ל-DB
- **AiCoachChat**: שמירת היסטוריית צ׳אט ל-DB
- יצירת hook `useUserData` כללי לשמירה/טעינה מהמסד
- fallback ל-localStorage למשתמשים לא מחוברים

### 6. תיקון שגיאות Build קיימות
תיקון ~20 שגיאות TypeScript קיימות (MobileTabBar, calendar, qaAgents, Landing, PlanView, Profile, eventQueue, semanticSearch ועוד)

## פרטים טכניים

```text
┌─────────────┐     ┌──────────────────────┐
│ user_roles   │     │ differentiation_results│
│ user_id (FK) │     │ user_id (FK)          │
│ role (enum)  │     │ form_data (jsonb)     │
└─────────────┘     │ result (jsonb)        │
                     └──────────────────────┘
                     ┌──────────────────────┐
                     │ user_form_data        │
                     │ user_id (FK)          │
                     │ form_type (text)      │
                     │ data (jsonb)          │
                     └──────────────────────┘
```

**RLS Pattern:**
- משתמש רגיל: `USING (auth.uid() = user_id)`
- אדמין: `USING (public.has_role(auth.uid(), 'admin'))`

לאחר האישור, אצטרך לדעת את כתובת המייל שלך כדי להגדיר אותך כאדמין.

