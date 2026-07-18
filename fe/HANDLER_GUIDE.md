# CHanlder Pattern Guide

## Cấu trúc thư mục

```
src/feature-name/
├── featureHandler.ts          # Handler class
├── FeatureHandlerContext.tsx  # Context + Provider + Hooks
├── FeatureComponent.tsx       # Component chính (tự bọc Provider)
├── components/                # Component con theo chức năng
│   ├── header/
│   │   ├── Header.tsx
│   │   └── Header.state.ts
│   ├── list/
│   │   ├── List.tsx
│   │   └── List.state.ts
│   └── form/
│       ├── Form.tsx
│       └── Form.state.ts
└── sub-handler/               # Sub-handlers theo chức năng
    ├── index.ts
    ├── init/
    │   ├── init.handler.ts
    │   └── init.event.ts
    └── fetch-data/
        ├── fetchData.handler.ts
        └── fetchData.event.ts
```

## 1. Tạo Handler

```typescript
// featureHandler.ts
import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler"; // Load sub-handlers

export interface FeatureEvents {}
export interface FeatureStates extends BaseStates {}

export class FeatureHandler extends CHanlder<FeatureEvents, FeatureStates> {
  constructor() {
    super("feature-context");
  }
}
```

## 2. Tạo Context + Hook

```typescript
// FeatureHandlerContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { FeatureHandler, FeatureStates } from "./featureHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const FeatureHandlerContext = createContext<FeatureHandler | null>(null);

export function FeatureHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new FeatureHandler());
  return (
    <FeatureHandlerContext.Provider value={handler}>
      {children}
    </FeatureHandlerContext.Provider>
  );
}

export function useFeatureHandler() {
  const handler = useContext(FeatureHandlerContext);
  if (!handler) throw new Error("useFeatureHandler must be used within FeatureHandlerProvider");
  return handler;
}

export function useFeatureState<K extends StateKey<FeatureStates>>(
  key: K,
  initialValue?: StateValue<FeatureStates, K>
) {
  const handler = useFeatureHandler();
  return useChandlerState<FeatureStates, K>(key, handler, initialValue);
}
```

## 3. Định nghĩa State Types

```typescript
// FeatureComponent.state.ts
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface FeatureComponentStates extends BaseStates {
  count: number;
  data: string | null;
}

declare module "./featureHandler" {
  interface FeatureStates extends FeatureComponentStates {}
}
```

## 4. Component chính (tự bọc Provider)

Component chính chỉ chứa các component con, gọi `init` event để khởi tạo dữ liệu.

```typescript
// FeatureComponent.tsx
import { useEffect } from "react";
import { FeatureHandlerProvider, useFeatureHandler } from "./FeatureHandlerContext";
import { Header } from "./components/header/Header";
import { List } from "./components/list/List";
import { Form } from "./components/form/Form";

function FeatureComponentInner() {
  const handler = useFeatureHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div>
      <Header />
      <List />
      <Form />
    </div>
  );
}

export function FeatureComponent() {
  return (
    <FeatureHandlerProvider>
      <FeatureComponentInner />
    </FeatureHandlerProvider>
  );
}
```

## 5. Component con (hiển thị + tương tác)

Component con được tổ chức theo folder và chức năng. Mỗi component có file `.state.ts` riêng nếu cần share state.

```typescript
// components/header/Header.tsx
import { useFeatureState, useFeatureHandler } from "../../FeatureHandlerContext";
import "./Header.state";

export function Header() {
  const [title] = useFeatureState("title");
  const handler = useFeatureHandler();

  const handleRefresh = () => {
    handler.executeEvent("refresh", {});
  };

  return (
    <header>
      <h1>{title}</h1>
      <button onClick={handleRefresh}>Refresh</button>
    </header>
  );
}
```

```typescript
// components/header/Header.state.ts
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface HeaderStates extends BaseStates {
  title: string;
}

declare module "../../featureHandler" {
  interface FeatureStates extends HeaderStates {}
}
```

```typescript
// components/list/List.tsx
import { useFeatureState } from "../../FeatureHandlerContext";
import "./List.state";

export function List() {
  const [items] = useFeatureState("items");
  
  return (
    <ul>
      {items?.map((item) => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}
```

```typescript
// components/list/List.state.ts
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface ListStates extends BaseStates {
  items: Array<{ id: string; name: string }>;
}

declare module "../../featureHandler" {
  interface FeatureStates extends ListStates {}
}
```

## 6. Sub-Handler (xử lý logic)

### Init Event (khởi tạo dữ liệu)

```typescript
// sub-handler/init/init.event.ts
import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: {}; result: void };
}

declare module "../../featureHandler" {
  interface FeatureEvents extends InitEvent {}
}
```

```typescript
// sub-handler/init/init.handler.ts
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";

@RegisterHandler("feature-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    // Khởi tạo state mặc định
    this.setState("count", 0);
    this.setState("data", null);
    
    // Fetch dữ liệu ban đầu nếu cần
    const data = await api.getInitialData();
    this.setState("data", data);
  }
}
```

### Action Event (xử lý logic)

```typescript
// sub-handler/fetch-data/fetchData.event.ts
import { BaseEvents } from "@/common";

export interface FetchDataEvent extends BaseEvents {
  fetchData: { params: { id: string }; result: DataType };
}

declare module "../../featureHandler" {
  interface FeatureEvents extends FetchDataEvent {}
}
```

```typescript
// sub-handler/fetch-data/fetchData.handler.ts
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";

@RegisterHandler("feature-context")
export class FetchDataHandler extends CSubHanlder {
  @HandlerDecorator("fetchData")
  async fetchData(params: { id: string }): Promise<DataType> {
    const result = await api.getData(params.id);
    this.setState("data", result); // Cập nhật state
    return result;
  }
}
```

### Load Sub-Handlers

```typescript
// sub-handler/index.ts
import "./init/init.handler";
import "./fetch-data/fetchData.handler";
```

## Quy tắc

1. **Component chính chỉ chứa component con** - Không xử lý logic, chỉ gọi `init` và render children
2. **Gọi init khi mount** - Component chính gọi `handler.executeEvent("init", {})` trong useEffect
3. **Logic xử lý trong sub-handler** - Mọi xử lý logic, fetch data, cập nhật state đều trong sub-handler
4. **Component con chỉ hiển thị + gọi event** - Đọc state để hiển thị, gọi event khi tương tác
5. **Component con chia theo folder/chức năng** - Mỗi chức năng 1 folder riêng trong `components/`
6. **State file đi theo component** - Mỗi component có file `.state.ts` riêng trong cùng folder
7. **Component chính tự bọc Provider** - Không cần wrap Provider khi sử dụng
8. **Dùng module augmentation** - Extend interface để merge state/event types
9. **Sub-handler không cần export** - Chỉ cần import trong `index.ts`, loadModule tự động đăng ký
10. **Event phải có type đầy đủ** - `params` và `result` bắt buộc định nghĩa
11. **Dùng useState bình thường** - State không share hoặc không cần từ sub-handler thì dùng `useState`
12. **Sub-handler chia theo chức năng** - Mỗi sub-handler chỉ xử lý 1 chức năng cụ thể
