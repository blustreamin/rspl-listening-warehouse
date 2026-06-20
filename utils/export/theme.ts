/* ============================================================================
   Export brand theme (F3 Gate 4b) — shared by toPptx + toDocx.
   Colours are hex WITHOUT '#' (the form both pptxgenjs and docx expect).
   Fonts degrade gracefully on the client's machine (Fraunces/Inter absent):
   headings = Georgia (brand blue), body = Calibri (Arial fallback).
   ============================================================================ */

export const C = {
  orange: 'F26F21', orange400: 'F58C39', orangeDk: 'DC5E14', orange700: 'B44A0E',
  orange50: 'FFF4EB', orange100: 'FFE6D2',
  blue: '1C3C8E', blue600: '274A99', blueDk: '142C6B', blue50: 'EEF2FB', blue100: 'DCE3F4',
  teal: '56C2D6', teal700: '1E8194', teal50: 'E9F7FA', teal100: 'D4F0F5',
  cream: 'FFFDF9', paperWarm: 'FFFBF4', white: 'FFFFFF',
  ink: '2A2A33', ink2: '4C4C57', ink3: '74747F', ink4: '9A9AA2',
  line: 'ECE3D4', lineCool: 'E3E8F2',
  rose: 'E5544A', roseDk: 'B4231C', rose50: 'FCEEEC',
};

export const FONT = {
  head: 'Georgia',   // brand-blue editorial headings (Fraunces stand-in)
  body: 'Calibri',   // body / UI (Inter stand-in)
};

// DOCX page geometry — A4 portrait, 1" margins → 9026 DXA content width.
export const DXA = {
  pageW: 11906, pageH: 16838, margin: 1440, content: 9026,
};

export const sevColor = (sev?: string): string => {
  const u = (sev || '').toUpperCase();
  return u === 'HIGH' ? C.rose : u === 'LOW' ? C.teal : C.orange;
};
export const confColor = (c?: string): string => {
  const u = (c || '').toUpperCase();
  return u === 'HIGH' ? C.teal700 : u === 'LOW' ? C.ink3 : C.orange700;
};
export const confLabel = (c?: string): string => {
  const u = (c || '').toUpperCase();
  return u === 'HIGH' ? 'High' : u === 'LOW' ? 'Low' : 'Medium';
};
