import { listingError, type Locale } from './text';
import type { DraftPublishErrorCode } from './draft-publish';
export function draftPublicationError(error: {code: DraftPublishErrorCode; message?: string}, locale: Locale, mode: 'new' | 'edit' = 'new'): string {
  if (error.message) return listingError(error.message, locale);
  const en = locale === 'en';
  if (error.code === 'SOURCE_CONFLICT') return en ? 'The published listing changed elsewhere. Your edits are kept. Compare the current listing before reloading it.' : 'המודעה שפורסמה השתנתה במקום אחר. השינויים שלך נשמרו כאן. השוו לגרסה הנוכחית לפני טעינה מחדש.';
  if (mode === 'edit') {
    if (error.code === 'VALIDATION_FAILED') return en ? 'Complete valid listing and room details and keep 3–8 photos before saving changes.' : 'יש להשלים פרטי מודעה וחדרים תקינים ולהשאיר 3–8 תמונות לפני שמירת השינויים.';
    if (error.code === 'VERSION_CONFLICT') return en ? 'This draft changed elsewhere. Your edits are kept. Compare and load the saved draft to continue.' : 'הטיוטה השתנתה במקום אחר. השינויים שלך נשארו כאן. השוו וטענו את הטיוטה השמורה כדי להמשיך.';
    if (error.code === 'PHOTO_UNAVAILABLE') return en ? 'Could not read saved photos. Your edit draft is kept. Retry.' : 'לא הצלחנו לקרוא את התמונות השמורות. טיוטת העריכה נשמרה. נסו שוב.';
    if (error.code === 'PUBLICATION_NOT_STARTED') return en ? 'The update has not started. Return to editing to continue.' : 'העדכון טרם התחיל. חזרו לעריכה כדי להמשיך.';
    if (error.code === 'PUBLICATION_PENDING') return en ? 'Changes are not confirmed. Retry the same update or return to editing.' : 'שמירת השינויים עדיין לא אושרה. נסו שוב את אותו עדכון או חזרו לעריכה.';
    return en ? 'Could not confirm the listing update. Your draft and photos are kept. Check saved changes or retry.' : 'לא הצלחנו לאשר את עדכון המודעה. הטיוטה והתמונות נשמרו. בדקו את שמירת השינויים או נסו שוב.';
  }
  if (error.code === 'LOCATION_REQUIRED') return en ? 'Select the address again or confirm a valid manual location. If publication has already started, choose Return to editing first.' : 'בחרו את הכתובת מחדש או אשרו מיקום ידני תקין. אם הפרסום כבר התחיל, בחרו קודם בחזרה לעריכה.';
  if (error.code === 'VALIDATION_FAILED') return en ? 'Complete the required fields and add 3–8 photos before publishing.' : 'יש להשלים את שדות החובה ולהוסיף 3–8 תמונות לפני פרסום.';
  if (error.code === 'VERSION_CONFLICT') return en ? 'This draft changed elsewhere. Your edits are kept. Load the saved version to continue.' : 'הטיוטה השתנתה במקום אחר. השינויים שלך נשמרו כאן. יש לטעון את הגרסה השמורה כדי להמשיך.';
  if (error.code === 'PHOTO_UNAVAILABLE') return en ? 'Could not read saved photos. Your draft is kept. Try again.' : 'לא הצלחנו לקרוא את התמונות השמורות. הטיוטה נשמרה. נסו שוב.';
  if (error.code === 'PUBLICATION_PENDING') return en ? 'Publication is not confirmed. Retry the same attempt or return to editing.' : 'הפרסום עדיין לא אושר. אפשר לנסות שוב את אותו ניסיון או לחזור לעריכה.';
  if (error.code === 'PUBLICATION_NOT_STARTED') return en ? 'Publication has not started. You can continue editing.' : 'הפרסום לא התחיל. אפשר להמשיך בעריכה.';
  return en ? 'Could not confirm publication. Your draft and photos are kept. Check the status or retry.' : 'לא הצלחנו לאשר את הפרסום. הטיוטה והתמונות נשמרו. בדקו את המצב או נסו שוב.';
}
