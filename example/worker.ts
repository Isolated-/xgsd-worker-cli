export default async function (data: any) {
  const url = data?.url ?? 'https://timeapi.io/api/Time/current/zone?timeZone=Europe/London'

  const res = await fetch(url)
  const json = await res.json()

  return json
}

const logger = async (ctx: any, next: any) => {
  console.log(`calling function`)

  try {
    await next()
  } catch (error) {
    ctx.code = 500
  }

  console.log('done')
}

export const middleware = () => [logger]
