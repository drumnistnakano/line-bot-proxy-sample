import {
  ClientConfig,
  WebhookEvent,
  WebhookRequestBody,
  messagingApi,
} from '@line/bot-sdk'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { isValidateHeaders } from '../util/validateRequest'
import { ReplyMessageResponse } from '@line/bot-sdk/dist/messaging-api/api'
import { fetch } from 'undici'
import 'source-map-support/register'
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { z } from 'zod'

export type LineUserId = string
export interface LineUser {
  lineUserId: string
}
export type FindLineUserResult = LineUser | undefined
export const lineUserDdbItemSchema = z.object({
  // @see https://developers.line.biz/ja/docs/messaging-api/getting-user-ids/#what-is-user-id
  lineUserId: z.string().regex(/U[0-9a-f]{32}/, {
    message: 'U[0-9a-f]{32}の正規表現形式のLINE UserIdを記載してください',
  }),
})
export type LineUserDdbItem = z.infer<typeof lineUserDdbItemSchema>
export const lineUserDdbItemToLineUser = (
  lineUserDdbItem: LineUserDdbItem
): LineUser => ({
  lineUserId: lineUserDdbItem.lineUserId,
})

const config: ClientConfig = {
  channelAccessToken: process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_MESSAGING_API_CHANNEL_SECRET!,
}

const lineBotClient = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
})

const ddbDoc = DynamoDBDocument.from(
  new DynamoDB({
    region: 'ap-northeast-1',
    maxAttempts: 5,
    // リトライ処理の設定
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 2000,
      requestTimeout: 2000,
      socketTimeout: 2000,
    }),
    logger: console,
  })
)

const findByLineUserId = async (
  lineUserId: LineUserId,
  lineUsersTableName: string
): Promise<FindLineUserResult> => {
  const { Item: lineUserDdbItem } = await ddbDoc.get({
    TableName: lineUsersTableName,
    Key: {
      lineUserId,
    },
  })

  if (lineUserDdbItem == null) {
    return undefined
  }

  return lineUserDdbItemToLineUser(lineUserDdbItemSchema.parse(lineUserDdbItem))
}

/**
 * LINEプラットフォームから送信されたWebhookイベントをさばく関数
 * lineUsersテーブルにUIDが移行されていれば、そのままreplyMessage送信
 * lineUsersテーブルにUIDが移行されていなければ、受け取ったデータを旧Botサーバへ横流しして送ってもらう
 *
 * @param {WebhookEvent} webhookEvent
 * @param {APIGatewayProxyEvent} event
 * @return {*}  {(Promise<ReplyMessageResponse | string | null>)}
 */
const processWebhookEvent = async (
  webhookEvent: WebhookEvent,
  event: APIGatewayProxyEvent
): Promise<ReplyMessageResponse | string | null> => {
  if (webhookEvent.type !== 'message' || webhookEvent.message.type !== 'text') {
    return null
  }
  if (webhookEvent.source.userId == null) {
    return null
  }

  const lineUserDdbItem = await findByLineUserId(
    webhookEvent.source.userId,
    process.env.LINE_USERS_TABLE_NAME!
  )

  // lineUsersテーブルにデータ移行されていない場合は、旧Botにてボット配信
  if (lineUserDdbItem == null) {
    console.log('Webhookへのリクエスト開始')

    const response = await fetch(new URL(process.env.OLD_LINE_WEBHOOK_URL!), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': event.headers['x-line-signature']!,
      },
      body: event.body,
    })

    console.log('Webhookへのリクエスト終了')
    console.log(response)

    const responseBody = await response.text()
    console.log({ responseBody })
    return responseBody
  }

  return lineBotClient.replyMessage({
    replyToken: webhookEvent.replyToken,
    messages: [
      {
        type: 'text',
        text: `新Botサーバより送信:${webhookEvent.message.text}`,
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

    const webhookRequestBody: WebhookRequestBody = JSON.parse(event.body!)
    const { events: webhookEvents } = webhookRequestBody
    const results = await Promise.allSettled(
      webhookEvents.map(async (webhookEvent) =>
        processWebhookEvent(webhookEvent as WebhookEvent, event)
      )
    )

    const rejectedStatus = results.filter(
      (result) => result.status == 'rejected'
    )
    if (rejectedStatus.length > 0) {
      throw new Error('replyMessageに失敗しました')
    }

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
