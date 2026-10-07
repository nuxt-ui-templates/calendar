import { defineEventHandler, readValidatedBody, setResponseStatus } from 'nuxt/server'

export default defineEventHandler(async (event): Promise<CalendarEvent> => {
  const body = await readValidatedBody(event, eventSchema)

  useEditableStore(event).events.set(body.id, body)

  setResponseStatus(event, 201)

  return body
})
