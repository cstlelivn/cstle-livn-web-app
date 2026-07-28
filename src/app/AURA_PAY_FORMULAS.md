# Aura Pay Calculation Formulas - Quick Reference

## 📐 Exact Formulas (DO NOT DEVIATE)

### 1. Base Pay
```
base_pay = expected_hours × hourly_rate
```
**Example:** 8 hours × $15/hr = **$120 base pay**

---

### 2. Efficiency Ratio
```
efficiency_ratio = expected_hours / actual_hours
efficiency_capped = clamp(efficiency_ratio, 0.7, 1.4)
```
**Examples:**
- Expected 8hrs, Actual 6hrs → 8/6 = 1.33 → **133% efficient** ✅
- Expected 8hrs, Actual 8hrs → 8/8 = 1.00 → **100% efficient** ⚪
- Expected 8hrs, Actual 10hrs → 8/10 = 0.80 → **80% efficient** ⚠️
- Expected 8hrs, Actual 20hrs → 8/20 = 0.40 → capped at 0.70 → **70% efficient** ⚠️

---

### 3. Efficiency Bonus Rate
```
efficiency_bonus_rate = (efficiency_capped - 1) × 0.25
```
**Examples:**
- 133% efficient → (1.33 - 1) × 0.25 = **+8.25% bonus**
- 100% efficient → (1.00 - 1) × 0.25 = **0% bonus**
- 80% efficient → (0.80 - 1) × 0.25 = **-5% bonus**

---

### 4. Quality Bonus Rate (Exact Mapping)
```
5 stars → +10%
4 stars → +6%
3 stars → +2%
2 stars → 0%
1 star  → -4%
0 stars → -8%
```

---

### 5. Total Bonus
```
raw_bonus = base_pay × (efficiency_bonus_rate + quality_bonus_rate)
bonus_capped = min(raw_bonus, base_pay × 0.20)
```
**Max bonus = 20% of base pay**

**Example 1:** (High Performance)
- Base: $120
- Efficiency: 133% → +8.25%
- Quality: 5★ → +10%
- Raw: $120 × (0.0825 + 0.10) = $120 × 0.1825 = $21.90
- **Bonus: $21.90** (under 20% cap of $24)

**Example 2:** (Exceptional Performance - Capped)
- Base: $120
- Efficiency: 140% → +10% (max)
- Quality: 5★ → +10%
- Raw: $120 × (0.10 + 0.10) = $120 × 0.20 = $24.00
- **Bonus: $24.00** (exactly at 20% cap)

**Example 3:** (Poor Performance)
- Base: $120
- Efficiency: 80% → -5%
- Quality: 1★ → -4%
- Raw: $120 × (-0.05 + -0.04) = $120 × -0.09 = -$10.80
- **Bonus: -$10.80** (negative bonus = penalty)

---

### 6. Penalty
```
penalty = rework_hours × hourly_rate
```
**Example:** 2 rework hours × $15/hr = **$30 penalty**

---

### 7. Final Task Pay
```
final_task_pay = base_pay + bonus_capped - penalty
```
**Can be lower than base pay if penalties exceed bonuses.**

**Example 1:** (Great work)
- Base: $120
- Bonus: +$21.90
- Penalty: -$0
- **Final: $141.90**

**Example 2:** (Needs rework)
- Base: $120
- Bonus: -$10.80 (poor performance)
- Penalty: -$30 (2 rework hours)
- **Final: $79.20** (below base pay)

---

## 🎖️ Aura Points (Exact Mapping)

```
5 stars → +5 Aura
4 stars → +3 Aura
3 stars → +1 Aura
2 stars → -1 Aura
1 star  → -3 Aura
0 stars → -5 Aura
```

**Note:** Aura points are cumulative per pay period and determine Aura level.

---

## 💰 Complete Example

### Task Details:
- Expected Hours: 8
- Actual Hours: 6.5
- Hourly Rate: $15
- Quality Rating: 4★
- Rework Hours: 0

### Calculations:

**Base Pay:**
```
8 × $15 = $120
```

**Efficiency:**
```
8 / 6.5 = 1.23 (123%)
Efficiency Bonus Rate = (1.23 - 1) × 0.25 = 0.0575 = 5.75%
```

**Quality:**
```
4★ = +6%
```

**Total Bonus:**
```
Raw = $120 × (0.0575 + 0.06) = $120 × 0.1175 = $14.10
Capped = min($14.10, $24.00) = $14.10
```

**Penalty:**
```
0 × $15 = $0
```

**Final Pay:**
```
$120 + $14.10 - $0 = $134.10
```

**Aura Points:**
```
4★ = +3 Aura
```

### Result Summary:
| Metric | Value |
|--------|-------|
| Base Pay | $120.00 |
| Efficiency | 123% |
| Quality | 4★ |
| Bonus | +$14.10 |
| Penalty | $0.00 |
| **Final Pay** | **$134.10** |
| **Aura Points** | **+3** |

---

## 🎯 Key Rules

1. **Base pay ALWAYS uses expected hours, never actual hours**
2. **Efficiency is capped at 0.7 - 1.4 range**
3. **Max bonus is 20% of base pay**
4. **Penalties CAN reduce pay below base pay**
5. **Quality bonus can be negative (poor quality)**
6. **Efficiency bonus can be negative (slow work)**
7. **Aura points are separate from pay** (performance metric)

---

## 📊 Optimization Strategies

### For Workers:
- **Beat expected hours** → Efficiency bonus
- **High quality work** → Quality bonus + positive Aura
- **Avoid rework** → No penalties
- **Aim for 5★** → Maximum quality bonus (+10%) + max Aura (+5)

### For Managers:
- **Set realistic expected hours** → Fair efficiency measurement
- **Encourage quality over speed** → Negative Aura hurts morale
- **Use rework hours sparingly** → Only for serious quality issues
- **Review 0-2★ tasks** → Coaching opportunities

### For QC:
- **Be consistent with ratings** → Fair performance tracking
- **Document rework needs** → Justifiable penalties
- **Use notes field** → Provide actionable feedback
- **Consider difficulty** → Adjust expectations accordingly

---

## 🧮 Calculator

Use this logic to manually verify calculations:

```javascript
function calculateTaskPay(expectedHours, actualHours, hourlyRate, qualityRating, reworkHours = 0) {
  // Base Pay
  const basePay = expectedHours * hourlyRate;
  
  // Efficiency
  const efficiencyRatio = Math.max(0.7, Math.min(1.4, expectedHours / actualHours));
  const efficiencyBonusRate = (efficiencyRatio - 1) * 0.25;
  
  // Quality
  const qualityMap = { 5: 0.10, 4: 0.06, 3: 0.02, 2: 0.00, 1: -0.04, 0: -0.08 };
  const qualityBonusRate = qualityMap[qualityRating] || 0;
  
  // Bonus
  const rawBonus = basePay * (efficiencyBonusRate + qualityBonusRate);
  const bonusCapped = Math.min(rawBonus, basePay * 0.20);
  
  // Penalty
  const penalty = reworkHours * hourlyRate;
  
  // Final Pay
  const finalPay = basePay + bonusCapped - penalty;
  
  // Aura
  const auraMap = { 5: 5, 4: 3, 3: 1, 2: -1, 1: -3, 0: -5 };
  const auraPoints = auraMap[qualityRating] || 0;
  
  return { basePay, efficiencyRatio, bonusCapped, penalty, finalPay, auraPoints };
}
```

---

**Last Updated:** Implementation Complete
**Formulas Status:** ✅ Locked - Do Not Modify
**Implemented In:** `/src/features/aura/api.ts` → `calculateTaskPay()`
