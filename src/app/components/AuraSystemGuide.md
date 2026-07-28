# Aura Rating System - Implementation Guide

## Overview
The Aura Performance System allows you to rate team members on a 5-star scale, which automatically calculates their Aura level and points.

## How to Rate Team Members

### 1. Access the Rating Dialog
- Navigate to **Team & Employee Management**
- Find the team member you want to rate
- Click the **"View Performance Details"** button on their card

### 2. Update the Rating
The rating dialog provides:
- **Interactive Star Rating** - Click on stars 1-5 to set the rating (supports whole numbers)
- **Live Preview** - See the Aura level update as you hover over stars
- **Rating Criteria** - Reference guide showing what to consider:
  - Quality of Work
  - Timeliness
  - Communication
  - Teamwork
  - Problem Solving
- **Aura Level Guide** - Shows point thresholds for each level
- **Performance Feedback** - Optional text field for specific feedback

### 3. Aura Levels & Points
The system automatically assigns levels based on star ratings:

| Star Rating | Aura Level     | Points |
|-------------|----------------|--------|
| 4.8 - 5.0   | Legendary      | 500    |
| 4.5 - 4.7   | Master         | 400    |
| 4.0 - 4.4   | Expert         | 300    |
| 3.5 - 3.9   | Professional   | 200    |
| 3.0 - 3.4   | Skilled        | 100    |
| < 3.0       | Developing     | 50     |

### 4. Save the Rating
- Review your rating and feedback
- Click **"Update Rating"** to save
- The team member's card will immediately reflect the new rating

## Integrating with Supabase

### Database Schema
To persist ratings in Supabase, you'll need a table structure like:

```sql
-- Team Members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Employee' or 'Contractor'
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  rating DECIMAL(2,1) DEFAULT 3.0,
  skills TEXT[],
  projects_completed INTEGER DEFAULT 0,
  availability TEXT DEFAULT 'Available',
  current_project TEXT,
  join_date DATE NOT NULL,
  hours_logged INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance Reviews table (for history tracking)
CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID REFERENCES team_members(id),
  reviewer_id UUID REFERENCES auth.users(id),
  rating DECIMAL(2,1) NOT NULL,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Implementation Example

Update the `handleUpdateRating` function in TeamManagement.tsx:

```typescript
import { supabase } from "../utils/supabase/client";

const handleUpdateRating = async (memberId: number, newRating: number, feedback: string) => {
  try {
    // Update the local state
    setTeamMembersData(prev =>
      prev.map(member =>
        member.id === memberId
          ? { ...member, rating: newRating }
          : member
      )
    );

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ 
        rating: newRating,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (updateError) throw updateError;

    // Create a performance review record
    const { error: reviewError } = await supabase
      .from('performance_reviews')
      .insert({
        team_member_id: memberId,
        reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        rating: newRating,
        feedback: feedback || null
      });

    if (reviewError) throw reviewError;

    console.log(`Successfully updated rating for member ${memberId} to ${newRating}`);
  } catch (error) {
    console.error('Error updating rating:', error);
    // Optionally revert the local state or show an error message
  }
};
```

## Best Practices

1. **Regular Reviews** - Rate team members after project completion or monthly
2. **Specific Feedback** - Always provide constructive feedback with ratings
3. **Consistency** - Use the rating criteria consistently across all team members
4. **Track History** - Use the performance_reviews table to track rating changes over time
5. **Privacy** - Only allow managers and admins to view/edit ratings

## Features

- **Real-time Updates** - Ratings update immediately in the UI
- **Visual Feedback** - Progress bars and color-coded levels
- **Rating History** - Track performance over time
- **Feedback System** - Provide actionable feedback to team members
- **Aura Gamification** - Motivate team members with level progression
