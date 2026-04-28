# Installera anpassad inbjudningsmall på Supabase

## Steg-för-steg

1. Gå till **Supabase Dashboard** → ditt projekt
2. Navigera till **Authentication → Email Templates**
3. Klicka på **Invite** under "Transactional Emails"
4. Ersätt innehållet med:

### HTML-versionen
Kopiera innehållet från `invite-email-template.html` och klistra in i HTML-redigeraren.

### Text-versionen
Kopiera innehållet från `invite-email-template.txt` och klistra in i textversionen.

## Variabler
- `{{ .RedirectTo }}` — destinationen från appens invite-route. Sätts av API:et
  till `/auth/confirm` på admin-ytan, en server-route som verifierar token
  via SSR-klienten och skriver sessionscookies innan vidareledning till
  `/accept-invite`.
- `{{ .TokenHash }}` — engångstoken för invite-verifiering

Rekommenderad länk i mallen:
- `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`

Varför: server-routen `/auth/confirm` använder `verifyOtp` med cookies-medveten
klient, vilket undviker PKCE-verifierproblemet i webbläsaren (token genereras
server-side så ingen verifier finns lokalt) och fungerar även om
mailklientens länkskanner skulle förladda `ConfirmationURL`. Routen accepterar
både `?token_hash=…&type=…` och `?code=…` så samma URL fungerar oavsett om
mallen i Supabase-dashboarden uppdaterats eller står kvar på default.

## Design-notes
- Gradientbakgrund med Startupkompassen-färger (`#0E3F52` och `#38B4E3`)
- Responsive design — fungerar på mobil och desktop
- Säkerhetsnote om länkens giltighet
- Fallback-länk för kopiering om knappen inte fungerar
- Professional footer med varumärkesinfo

## Test
Efter att ha sparat mallen, testa inbjudan från admin-panelen för att verifiera att
- Länken fungerar
- Designen ser rätt ut i vilken e-postklient som helst
- Texter är korrekta