import { CHanlder, HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { Sub1Event } from "./sub1.event";

@RegisterHandler("helloworld")
export class Sub1Handler extends CSubHanlder {
  @HandlerDecorator("helloworld")
  async helloworld(temp: string): Promise<boolean> {
    return true;
  }
}
