# StoryPoints Rules

This is the rule that includes rules loaders for calculating points on each
Activity.

## Rule Signature

Every rule should accept an `IActivity` and return `RuleResults`.

```typescript
// This is not a real rule
export default async function (ctx: RuleContext, act: IActivity): RuleResults {
  let points = 0
  if (address(act.currency) === '0x0000000000000000000000000000000000000000') {
    // Give 100 points if the price is over 1 ETH
    points += BigInt(act.price) >= BigInt(1000000000000000000) ? 100 : 0
  }
  return {
    ...ctx,
    points: (ctx += points),
  }
}
```
