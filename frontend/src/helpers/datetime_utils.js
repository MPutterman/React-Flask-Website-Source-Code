
// Convert date created in frontend (incorrectly captured in local time but with
// timezone set as GMT) to proper UTC time
export function fixDateFromFrontend (date) {
    if (!date) return date;
    return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
}

// Convert date create in backend (correctly represented in UTC) to a date with
// local offset aplied
export function fixDateFromBackend (dateString) {
    if (!dateString) return null; // convert any empty value to null
    const date = new Date(dateString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
}
