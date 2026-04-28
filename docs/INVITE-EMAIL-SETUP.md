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
- `{{ .RedirectTo }}` — destinationen som API:et anger (`/accept-invite` på
  admin-ytan).
- `{{ .TokenHash }}` — engångstoken för invite-verifiering.

Mallen MÅSTE använda denna länk:
- `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`

Varför just så: token verifieras inte när användaren landar på sidan – den
verifieras först när användaren submitterar lösenordsformuläret
(`POST /api/auth/accept-invite`). Det gör flödet immunt mot
företagsmail-skannrar (Microsoft SafeLinks, Mimecast m.fl.) som förladdar
GET-länkar och annars skulle bränna engångstoken innan personen hinner klicka.

Använd inte default `{{ .ConfirmationURL }}` — den passerar Supabase verify-
endpoint och returnerar med en PKCE-kod som webbläsaren saknar verifier för
(inbjudan skapas server-side), vilket leder till "Inbjudan saknas".

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