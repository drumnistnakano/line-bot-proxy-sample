import { ClientConfig, WebhookEvent, messagingApi } from '@line/bot-sdk'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { isValidateHeaders } from '../util/validateRequest'
import { ReplyMessageResponse } from '@line/bot-sdk/dist/messaging-api/api'

const config: ClientConfig = {
  channelAccessToken: process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_MESSAGING_API_CHANNEL_SECRET!,
}

const lineBotClient = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
})

const processWebhookEvent = async (
  event: WebhookEvent
): Promise<ReplyMessageResponse | null> => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null
  }

  return lineBotClient.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: 'text',
        text: event.message.text,
      },
    ],
  })
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(event)
  if (event.body == null) {
    return {
      statusCode: 200,
      body: JSON.stringify({}),
    }
  }

  try {
    const isValidHeaders = isValidateHeaders({
      headerSignature: event.headers['x-line-signature'],
      requestBody: event.body ?? undefined,
      channelSecret: config.channelSecret ?? undefined,
    })
    if (!isValidHeaders) {
      return {
        statusCode: 403,
        body: 'リクエストヘッダーエラー',
      }
    }

    // const webhookRequestBody: WebhookRequestBody = JSON.parse(event.body!)
    // const { events } = webhookRequestBody
    // const results = await Promise.allSettled(
    //   events.map(async (event) => processWebhookEvent(event as WebhookEvent))
    // )

    // const rejectedStatus = results.filter(
    //   (result) => result.status == 'rejected'
    // )
    // if (rejectedStatus.length > 0) {
    //   throw new Error('replyMessageに失敗しました')
    // }

    return {
      statusCode: 200,
      body: JSON.stringify({}),
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    }
  }
}
