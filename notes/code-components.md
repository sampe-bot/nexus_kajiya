`src/components` 直下には、次の2ファイルがあります。

- `SlideRenderer.tsx`：スライドを表示する
- `SlideEditor.tsx`：表示されたスライドを操作・編集する

設計としては、表示と編集操作を分離しています。

## `SlideRenderer.tsx`

`Slide` データを受け取り、画面上にスライドを描画するコンポーネントです。

```tsx
type SlideRendererProps = {
  slide: Slide;
  className?: string;
};
```

`slide` には、主に以下の情報が入っています。

- スライドの幅・高さ
- 背景色
- テキスト要素の位置とサイズ
- テキスト内容
- フォントサイズや色などのスタイル

### スライド本体

```tsx
<article
  className={`slide-renderer ${className}`.trim()}
  style={{ backgroundColor: slide.background }}
>
```

`article` がスライド本体です。背景色には `slide.background` を使用しています。

`className` は任意で追加でき、空白が余分に残らないよう `.trim()` しています。

### 固定装飾

```tsx
<div className="slide-accent" />
<p className="slide-kicker">NEXUS KAJIYA / 01</p>
```

アクセントやヘッダー、フッターはドキュメントデータではなく、コンポーネント内に固定されています。

`aria-hidden="true"` が付いているため、スクリーンリーダーには読み上げられません。

### テキスト要素の描画

```tsx
{slide.elements.map((element) => {
  if (element.type !== "text") {
    return null;
  }
```

スライド内の要素を順番に処理し、`type === "text"` の要素だけを描画します。

現在のスキーマにはテキストしかありませんが、将来的に画像や図形が追加されることを想定した分岐です。

### 座標をパーセントへ変換

```tsx
left: `${(element.x / slide.width) * 100}%`,
top: `${(element.y / slide.height) * 100}%`,
width: `${(element.width / slide.width) * 100}%`,
height: `${(element.height / slide.height) * 100}%`,
```

ドキュメント内の座標は、960×540のような論理座標です。それをパーセントへ変換して描画しています。

例えば、`x = 480`、`slide.width = 960` なら、左位置は50%です。

この仕組みにより、スライド全体が拡大・縮小されても要素の位置関係が保たれます。

### フォントサイズ

```tsx
fontSize: `${(element.style.fontSize / slide.width) * 100}cqw`,
```

`cqw` はコンテナ幅を基準にするCSS単位です。スライドの表示サイズに合わせて、フォントサイズも比例して変化します。

### ロール別クラス

```tsx
element.role ? `rendered-text--${element.role}` : ""
```

`role` が `title` なら、次のクラスが付きます。

```text
rendered-text--title
```

タイトルや本文など、役割ごとのCSSを適用できる構造です。

---

## `SlideEditor.tsx`

`SlideRenderer` の上に透明な操作レイヤーを重ね、テキストの選択、移動、編集を可能にします。

```tsx
type SlideEditorProps = {
  document: SlideDocument;
  onChange: (document: SlideDocument) => void;
};
```

変更後のドキュメントを内部だけで保持せず、`onChange` で親コンポーネントに返す制御コンポーネントです。

### 編集対象のスライド

```tsx
const slide = document.slides[0];
```

現状は、ドキュメントの最初のスライドだけを編集します。

複数スライドを表示できるデータ構造ですが、編集UI側はまだ1枚目固定です。

### 状態管理

```tsx
const dragStateRef = useRef<DragState | null>(null);
const [activeElementId, setActiveElementId] = useState<string | null>(null);
const [editing, setEditing] = useState<EditingState | null>(null);
```

それぞれの役割は次のとおりです。

- `dragStateRef`：ドラッグ開始時の座標など
- `activeElementId`：現在選択されている要素
- `editing`：テキスト編集中の要素と編集開始時の値

ドラッグ情報は画面表示に直接必要ないため、再レンダリングを起こさない `useRef` が使われています。

### 表示レイヤーと操作レイヤー

```tsx
<SlideRenderer slide={slide} />

<div className="editor-overlay">
  ...
</div>
```

構造は次のようになっています。

```text
SlideEditor
├── SlideRenderer    実際のスライド表示
└── editor-overlay   マウス操作を受け取る透明レイヤー
```

表示と操作判定を分けることで、`SlideRenderer` を編集画面以外のプレビューなどでも再利用できます。

### 要素の選択

```tsx
onPointerDown={(event) => {
  if (event.target === event.currentTarget) {
    setActiveElementId(null);
  }
}}
```

要素ではなくキャンバスの空白部分をクリックすると、現在の選択を解除します。

### ヒットボックス

各テキスト要素に対応する透明な `div` を、表示位置と同じ場所に配置しています。

```tsx
<div
  className="element-hitbox"
  style={{
    left: ...,
    top: ...,
    width: ...,
    height: ...,
  }}
>
```

このヒットボックスが、選択、ドラッグ、ダブルクリックを受け取ります。

---

## ドラッグ処理

### ドラッグ開始

```tsx
const startDrag = (event, element) => {
```

開始時に以下を記録します。

- 要素ID
- Pointer ID
- ポインターの開始位置
- 要素の開始位置

```tsx
dragStateRef.current = {
  elementId: element.id,
  pointerId: event.pointerId,
  startClientX: event.clientX,
  startClientY: event.clientY,
  startElementX: element.x,
  startElementY: element.y,
};
```

`setPointerCapture()` により、ポインターが要素の外へ出てもドラッグを継続できます。

テキスト編集中の要素はドラッグできません。

### ドラッグ中

```tsx
const bounds = canvas.getBoundingClientRect();
```

ブラウザ上の表示サイズを取得し、マウスの移動量をスライドの論理座標へ変換します。

```tsx
(event.clientX - drag.startClientX) *
  (slide.width / bounds.width)
```

例えば、画面上でスライドが480px幅、論理幅が960なら、マウスを10px動かすとスライド座標では20移動します。

変更後のデータは次の処理で生成されます。

```tsx
moveTextElement(document, slide.id, drag.elementId, { x, y })
```

`moveTextElement` は元のドキュメントを書き換えず、新しいドキュメントを返します。また、要素がスライド外へ出ないよう座標を制限しています。

### ドラッグ終了

```tsx
dragStateRef.current = null;
event.currentTarget.releasePointerCapture(event.pointerId);
```

ドラッグ状態を解除し、Pointer Captureも終了します。

---

## テキスト編集

要素をダブルクリックすると編集を開始します。

```tsx
onDoubleClick={(event) => beginEditing(event, element)}
```

編集中は、ヒットボックス内に `InlineTextEditor` が表示されます。

```tsx
{isEditing ? (
  <InlineTextEditor ... />
) : null}
```

### `InlineTextEditor`

ファイル内に定義された、小さな内部コンポーネントです。

```tsx
const [value, setValue] = useState(initialValue);
```

入力途中の値をローカルstateで管理します。

マウント直後には、テキストエリアへフォーカスして全選択します。

```tsx
useEffect(() => {
  textareaRef.current?.focus();
  textareaRef.current?.select();
}, []);
```

### 編集の確定とキャンセル

操作は次のようになっています。

- フォーカスが外れる：確定
- `Ctrl + Enter`：確定
- macOSの `Command + Enter`：確定
- `Escape`：キャンセル

確定すると次の処理が呼ばれます。

```tsx
updateTextElement(document, slide.id, elementId, text)
```

これも元のデータを直接変更せず、更新後の新しいドキュメントを生成します。

`finishedRef` は、キー操作後に発生する `blur` でもう一度確定処理が走るのを防いでいます。

---

## 全体のデータフロー

```text
親コンポーネント
  │ document
  ▼
SlideEditor
  ├── SlideRendererへslideを渡す
  ├── ドラッグ操作
  └── テキスト編集
       │
       ▼
documentOperations
  ├── moveTextElement
  └── updateTextElement
       │
       ▼
新しいSlideDocument
  │ onChange
  ▼
親コンポーネント
```

要点は、`SlideRenderer` が表示専用、`SlideEditor` が操作専用であることです。状態の本体は親が持ち、編集結果は `onChange` で上へ返す、Reactらしい単方向データフローになっています。