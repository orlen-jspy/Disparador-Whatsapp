const GREETING_SPINTAX: Record<string, string> = {
  morning: '{Bom dia|Excelente dia|Ótima manhã}',
  afternoon: '{Boa tarde|Excelente tarde|Ótima tarde}',
  night: '{Boa noite|Excelente noite|Ótima noite}'
}

export function injectGreeting(message: string): string {
  const hour = new Date().getHours()
  let greeting: string

  if (hour >= 5 && hour < 12) {
    greeting = GREETING_SPINTAX.morning
  } else if (hour >= 12 && hour < 18) {
    greeting = GREETING_SPINTAX.afternoon
  } else {
    greeting = GREETING_SPINTAX.night
  }

  const hasGreeting = /^\{?(Bom dia|Excelente dia|Ótima manhã|Boa tarde|Excelente tarde|Ótima tarde|Boa noite|Excelente noite|Ótima noite)/i.test(
    message.trim()
  )

  if (hasGreeting) return message

  return `${greeting}! ${message.trim()}`
}
