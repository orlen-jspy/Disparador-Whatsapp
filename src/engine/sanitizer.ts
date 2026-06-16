export function sanitizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')

  // Stripa código de país 55 se o número ficar com tamanho válido (8-11 dígitos)
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2)
  }

  if (digits.length < 8 || digits.length > 11) return null

  // Sem DDD (8-9 dígitos): adiciona 65 como padrão
  if (digits.length <= 9) {
    digits = '65' + digits
  }

  // Tem DDD mas sem o 9 do celular (10 dígitos): insere 9 após o DDD
  if (digits.length === 10) {
    digits = digits.slice(0, 2) + '9' + digits.slice(2)
  }

  return digits.length === 11 ? '+55' + digits : null
}

export function formatPhoneForSearch(phone: string): string {
  return phone.replace(/\D/g, '')
}
