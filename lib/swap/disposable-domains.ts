/**
 * Disposable-email blocklist (Part V: account farming — +2 scans per
 * fake account is the incentive). Hand-curated list of the highest-
 * volume disposable providers; not exhaustive, but combined with
 * email verification + Turnstile on signup it prices farming above
 * the value of two free scans.
 */

const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com",
  "anonaddy.me", "burnermail.io", "byom.de", "deadaddress.com",
  "dispostable.com", "dropmail.me", "emailondeck.com", "fakeinbox.com",
  "fakemail.net", "getairmail.com", "getnada.com", "guerrillamail.biz",
  "guerrillamail.com", "guerrillamail.de", "guerrillamail.info",
  "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
  "harakirimail.com", "inboxkitten.com", "incognitomail.org",
  "jetable.org", "linshiyouxiang.net", "mail-temp.com", "mail.tm",
  "mail7.io", "mailcatch.com", "maildrop.cc", "mailexpire.com",
  "mailinator.com", "mailinator.net", "mailnesia.com", "mailnull.com",
  "mailpoof.com", "mailsac.com", "mailslurp.com", "mint.lgbt",
  "mohmal.com", "moakt.com", "mytemp.email", "nada.email",
  "no-spam.ws", "nospam.today", "notmailinator.com", "nowmymail.com",
  "objectmail.com", "onetimeemail.net", "owlymail.com", "pokemail.net",
  "proxymail.eu", "rcpt.at", "sharklasers.com", "shieldemail.com",
  "smailpro.com", "sogetthis.com", "spam4.me", "spamavert.com",
  "spambox.us", "spamgourmet.com", "spamhole.com", "spaml.de",
  "tafmail.com", "temp-mail.io", "temp-mail.org", "tempail.com",
  "tempinbox.com", "tempmail.dev", "tempmail.email", "tempmail.plus",
  "tempmailo.com", "tempmailaddress.com", "tempr.email", "throwam.com",
  "throwawaymail.com", "tmail.ws", "tmailinator.com", "trash-mail.com",
  "trashmail.com", "trashmail.de", "trashmail.me", "trashmail.net",
  "wegwerfmail.de", "wegwerfmail.net", "yepmail.net", "yopmail.com",
  "yopmail.fr", "yopmail.net", "zetmail.com", "zippymail.info",
])

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@")
  if (at < 0) return false
  const domain = email.slice(at + 1).trim().toLowerCase()
  return DISPOSABLE_DOMAINS.has(domain)
}
