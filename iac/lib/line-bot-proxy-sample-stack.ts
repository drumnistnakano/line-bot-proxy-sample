import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { loadSsmParameterStores } from './load-ssm-parameter-stores'
import { createDdbTables } from './ddb-table'
import { createLineBotProxyApi } from './line-bot-proxy-api'

export class LineBotProxySampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // SSMパラメータストア
    const { lineChannelAccessToken, lineChannelSecret, oldLineWebhookUrl } =
      loadSsmParameterStores({ construct: this })

    // DynamoDBテーブル
    const { lineUsersTable } = createDdbTables({ construct: this })

    // LINE Bot APIリソース
    createLineBotProxyApi({
      construct: this,
      lineUsersTable,
      lineChannelAccessToken,
      lineChannelSecret,
      oldLineWebhookUrl,
    })
  }
}
