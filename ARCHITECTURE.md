# 設計と教材の追加方法

## 構成

- `index.html` / `home.js`：Python版ホームと4教材の進捗
- `data.html` / `app.js` / `sample.csv`：既存の売上データ探偵
- `lesson.html` / `lesson-app.js` / `lessons.css`：新しい3教材の共通画面、ミッション、ヒント、コード編集
- `lessons/gacha.js`、`lessons/robot.js`、`lessons/art.js`：各教材の設定、コード生成、結果描画、達成条件
- `shared/runner.js`：Workerの開始・再利用・停止、リクエスト照合、タイムアウト
- `shared/progress.js`：バージョン付き`localStorage`進捗と破損時の復旧
- `python-worker.js`：Pyodide 0.27.7でPythonを実行
- `html/index.html`：従来のHTML教材と上部のコース切り替え

フレームワーク、バックエンド、APIキー、課金APIはありません。静的ホスティングで動きます。

## Python実行の流れ

画面は`{type:'run', lessonId, requestId, code, data}`をWorkerへ送ります。WorkerはPyodideを一度だけ読み込み、各実行に独立したPythonの`globals`を使います。結果にも`lessonId`と`requestId`を付け、画面側で一致しない結果を無視します。停止や8秒の実行上限を超えた場合はWorkerを破棄し、次の実行で作り直します。初回ロードの上限は別に30秒です。

利用者の文字列は`LESSON_DATA_JSON`または`CSV_TEXT`というデータとしてPythonへ渡します。数値や決められた選択肢だけをコード生成に使用します。コード編集で形式外の結果が出た場合は、JSONとして解釈せず標準出力またはエラーを表示します。コードは20,000文字、戻り値は1,000,000文字、標準出力の保持は約200,000文字が上限です。

PyodideはOSレベルの完全な隔離ではありません。同じオリジンに秘密情報を置かない設計とし、画面表示は`textContent`など安全なDOM操作を使います。

## 各教材

**ガチャ**：名前はデータ、確率は検証済みの数値として渡します。Pythonの`random.choices`で1回または100回抽選し、Pythonが個数を集計します。設定割合と実際の回数を画面に並べます。

**会話ロボット**：ルールとメッセージはデータとして渡します。Pythonの`unicodedata.normalize('NFKC', ...)`と`strip`、`casefold`で入力を整え、完全一致を先に、部分一致を後に、各グループでは画面の上から順に調べます。AIへの接続はありません。表示履歴は最新24発言です。

**アート**：Pythonの`Pen`が座標と線分を計算し、構造化された描画命令を返します。JavaScriptは命令を検証してCanvas 2Dへ順に描くだけです。星は5本の線、花は小さな線を使う円の反復、ぐるぐるは線を伸ばす反復です。線は最大4,000本、座標は±5,000、数値設定は入力範囲内に制限します。Canvasは高DPIとリサイズに対応し、アニメーションの一時停止・再生とPNG保存ができます。

## 教材を追加するとき

1. `lessons/`に`initialState`、`missions`、`renderSettings`、`generateCode`、`validate`、`data`、`isResult`、`renderOutput`、`passes`を持つモジュールを作ります。
2. `lesson-app.js`の教材表、`index.html`のカード、`shared/progress.js`の教材IDを追加します。
3. 文字列はコード文字列に連結せず、`data()`からWorkerへ渡します。結果の型と件数を`isResult()`で検証します。
4. 設定・達成条件・停止・再実行・モバイル表示をテストします。

`npm test`は固定シードの抽選、0%の扱い、ロボットの判定順、アート座標と進捗破損を確認します。`npm run test:browser`は実際のPyodideを使い、4教材とHTML導線、操作、停止、PNG、390px幅を確認します。
