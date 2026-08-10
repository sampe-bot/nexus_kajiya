- 1コンポーネント = 1つの責務（やること）
  - 🧩 親コンポーネント（SlideEditor の親）
    - 責務：スライド全体の状態管理（state）
    - SlideDocument を持つ
    - 編集結果を保存する
    - 子コンポーネントにデータを渡す
    - 子からの変更通知（onChange）を受け取って state を更新する
  - 🧩 子コンポーネント（SlideEditor）
    - 責務：UI と編集操作
    - document を受け取る
    - 入力欄や編集UIを表示する
    - 編集されたら onChange(newDoc) を呼ぶ
- onChange は “値を返さない（void）けど、親の state を更新する” 関数
```
type SlideEditorProps = {
  document: SlideDocument;
  onChange: (document: SlideDocument) => void;
};
```
  - 子 --> 親への通知機能
  - 親自身でstate更新
  - onChange自体の戻り値はない

- 型定義
  - データ構造（SlideDocument, TextElement） → model/schema に置く
  - コンポーネントの props 型（SlideEditorProps） → コンポーネントの隣に置く（tsx 内）

- レイヤー構造を見抜くための 4つの目印
  1. コンポーネント境界（大文字で始まるタグ）
  2. 意味的にまとまった div（className が役割を示す）
  3. 繰り返し構造（map で生成される要素）
  4. 条件付きレンダリング（isEditing ? ...）

- useState & useRef
  - useState 
    → 値が変わると コンポーネントが再レンダリングされる
  - useRef
    → 値が変わっても 再レンダリングされない

- 型チェック
  - Zod = “実行時の型チェック”、TypeScript = “コンパイル時の型チェック”
  - JSON や API から来たデータを安全に扱うための“バリデーションエンジン”