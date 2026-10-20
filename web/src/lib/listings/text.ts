export type Locale = 'he' | 'en';
export const localePrefix = (locale: Locale) => locale === 'en' ? '/en' : '';
export function listingError(message: string, locale: Locale) {
  if (locale === 'he') return message;
  const messages: Record<string, string> = {
    'בחרו כתובת מחדש או אשרו מיקום ידני תקין.': 'Select the address again or confirm a valid manual location.',
    'יש להזין כותרת למודעה.': 'Enter a listing title.',
    'יש להזין את הכתובת המדויקת של הדירה.': 'Enter the exact address.',
    'יש להזין קו רוחב תקין עבור מיקום הדירה.': 'Enter a valid latitude.',
    'יש להזין קו אורך תקין עבור מיקום הדירה.': 'Enter a valid longitude.',
    'יש להזין מספר חדרים תקין.': 'Enter a valid bedroom count.',
    'יש להוסיף לפחות חדר פנוי אחד.': 'Add at least one available room.',
    'מספר החדרים הפנויים לא יכול להיות גדול ממספר החדרים בדירה.': 'Available rooms cannot exceed the bedroom count.',
    'יש להזין מחיר חודשי תקין לכל חדר פנוי.': 'Enter a valid monthly price for each room.',
    'יש לבחור תאריך כניסה.': 'Choose an available-from date.',
    'יש להוסיף לפחות 3 תמונות.': 'Add at least 3 photos.',
    'אפשר להוסיף עד 8 תמונות.': 'Add no more than 8 photos.',
    'אפשר להעלות קובצי תמונה בלבד.': 'Only image files are supported.',
    'כל תמונה צריכה להיות קטנה מ־12MB.': 'Each photo must be smaller than 12MB.',
    'יש לקצר את פרטי המודעה.': 'Shorten the listing details.',
    'לפני הפרסום יש להוסיף מספר טלפון פרטי בהגדרות הפרופיל.': 'Add a private phone number to your profile before publishing.',
    'לא הצלחנו לזהות את ניסיון הפרסום. נסו שוב.': 'Could not identify this publication attempt. Please retry.',
    'ניסיון הפרסום השתנה. פתחו טיוטה חדשה לפני פרסום.': 'This publication attempt has changed. Start a new draft before publishing.',
    'לא הצלחנו לפרסם את המודעה. נסו שוב בעוד רגע.': 'Could not publish the listing. Please retry.',
  };
  return messages[message] ?? 'Something went wrong. Check the details and try again.';
}
