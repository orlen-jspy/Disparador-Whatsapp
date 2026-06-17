function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12) return 'bom dia'
  if (hora >= 12 && hora < 18) return 'boa tarde'
  return 'boa noite'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function processSpintax(text: string, contactName: string): string {
  const saudacao = getSaudacao()
  const withName = text.replace(/\[NOME\]/g, contactName)

  const withGreeting = withName.replace(/\[SAUDACAO\]/g, (_match, offset: number) => {
    if (offset === 0) return capitalize(saudacao)
    for (let i = offset - 1; i >= 0; i--) {
      const ch = withName[i]
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') continue
      if (ch === '.' || ch === '!' || ch === '?') return capitalize(saudacao)
      break
    }
    return saudacao
  })

  return parseSpintax(withGreeting)
}

function parseSpintax(input: string): string {
  const stack: number[] = []
  const groups: { start: number; end: number; inner: string }[] = []

  for (let i = 0; i < input.length; i++) {
    if (input[i] === '{') {
      stack.push(i)
    } else if (input[i] === '}') {
      const start = stack.pop()
      if (start !== undefined) {
        groups.push({ start, end: i, inner: input.slice(start + 1, i) })
      }
    }
  }

  if (groups.length === 0) return input

  const last = groups[groups.length - 1]
  const options = splitOptions(last.inner)
  const chosen = options[Math.floor(Math.random() * options.length)]
  const resolved = input.slice(0, last.start) + chosen + input.slice(last.end + 1)

  return parseSpintax(resolved)
}

function splitOptions(inner: string): string[] {
  const options: string[] = []
  let depth = 0
  let current = ''

  for (const ch of inner) {
    if (ch === '{') {
      depth++
      current += ch
    } else if (ch === '}') {
      depth--
      current += ch
    } else if (ch === '|' && depth === 0) {
      options.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  if (current) options.push(current)
  return options
}
