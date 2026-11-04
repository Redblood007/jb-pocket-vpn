import { assertEquals, assertThrows } from "jsr:@std/assert";
import { buildUpiIntent } from "./upi.ts";

Deno.test("builds a UPI intent with exact INR amount and order reference", () => {
  const url = new URL(buildUpiIntent({
    vpa: "javaidbeigh121@okaxis",
    payeeName: "Javaid Beigh",
    amountInr: 199,
    orderReference: "JBVPN12345678ABCD",
  }));
  assertEquals(url.protocol, "upi:");
  assertEquals(url.searchParams.get("pa"), "javaidbeigh121@okaxis");
  assertEquals(url.searchParams.get("am"), "199.00");
  assertEquals(url.searchParams.get("cu"), "INR");
  assertEquals(url.searchParams.get("tr"), "JBVPN12345678ABCD");
});

Deno.test("rejects invalid VPA and non-positive amounts", () => {
  assertThrows(() => buildUpiIntent({
    vpa: "not-a-vpa", payeeName: "Test", amountInr: 99, orderReference: "JBVPN12345678",
  }));
  assertThrows(() => buildUpiIntent({
    vpa: "merchant@bank", payeeName: "Test", amountInr: 0, orderReference: "JBVPN12345678",
  }));
});
