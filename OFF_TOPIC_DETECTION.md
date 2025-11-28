# Off-Topic Query Detection - Implementation Summary

**Date**: 2025-10-24
**Status**: ✅ IMPLEMENTED

---

## 🎯 **Purpose**

Ensure VTU GPT only answers questions about **Vel Tech University** and politely rejects off-topic queries like:
- ❌ "How to make a burger?"
- ❌ "Who won the cricket match?"
- ❌ "What's the weather today?"
- ❌ "Recipe for pizza"

---

## ✅ **How It Works**

### **Step 1: Query Analysis**

The system checks every query against two keyword lists:

**🟢 On-Topic Keywords** (VTU/Academic):
- VTU, Vel Tech, university, college
- TTS, faculty, professor, teacher, staff
- Course, program, department, school
- Engineering, management, computer science
- Admission, fee, exam, result, grade
- Hostel, library, lab, campus
- Dean, HOD, student, academic
- Placement, internship, research
- And 20+ more academic terms

**🔴 Off-Topic Keywords** (Non-Academic):
- Recipe, cooking, food, burger, pizza
- Movie, film, celebrity, music
- Sports, cricket, football, game
- Travel, hotel, vacation
- Shopping, product, amazon
- Weather, politics, health
- Stock market, cryptocurrency
- And 30+ more non-academic terms

---

### **Step 2: Decision Logic**

```javascript
1. If query contains OFF-TOPIC keyword → ❌ REJECT immediately

2. Else if query contains ON-TOPIC keyword → ✅ ALLOW processing

3. Else (ambiguous query) → ✅ ALLOW (check Pinecone for context)
```

---

## 📊 **Examples**

### **❌ Rejected Queries:**

| Query | Detected Keyword | Status |
|-------|------------------|--------|
| "How to make a burger?" | "burger" | ❌ Rejected |
| "Recipe for chocolate cake" | "recipe", "cake" | ❌ Rejected |
| "Who won the cricket match?" | "cricket" | ❌ Rejected |
| "Best movies to watch" | "movie" | ❌ Rejected |
| "Weather forecast today" | "weather", "forecast" | ❌ Rejected |
| "Bitcoin price prediction" | "bitcoin" | ❌ Rejected |
| "How to invest in stocks?" | "stock market", "investment" | ❌ Rejected |

---

### **✅ Allowed Queries:**

| Query | Detected Keyword | Status |
|-------|------------------|--------|
| "What courses does VTU offer?" | "vtu", "course" | ✅ Allowed |
| "Tell me about Computer Science dept" | "computer science", "dept" | ✅ Allowed |
| "Where is TTS 3797's cabin?" | "tts", "cabin" | ✅ Allowed |
| "Admission requirements" | "admission" | ✅ Allowed |
| "Engineering programs available" | "engineering", "program" | ✅ Allowed |
| "Faculty contact details" | "faculty" | ✅ Allowed |
| "Exam schedule" | "exam", "schedule" | ✅ Allowed |

---

### **🤔 Ambiguous Queries (Allowed Through):**

| Query | Reason | Status |
|-------|--------|--------|
| "What is AI?" | No clear off-topic keyword, may relate to AI program | ✅ Allowed |
| "Tell me about Python" | Could be Python programming course | ✅ Allowed |
| "Latest news" | Could be campus news | ✅ Allowed |
| "How does it work?" | Generic, may relate to VTU systems | ✅ Allowed |

These ambiguous queries are allowed to proceed. If Pinecone finds no relevant context, the system will give a "no information found" response.

---

## 🎨 **Rejection Message**

When an off-topic query is detected, users receive:

```
I apologize, but I'm VTU GPT, a specialized assistant for Vel Tech University only.
I can only help with questions related to:

📚 Academic Information
- Courses, programs, and departments
- Faculty details and cabin locations
- Exam schedules and academic calendar
- Admission procedures and fees

🏛️ Campus Information
- Facilities and infrastructure
- Hostel and library services
- Events and activities

👥 People & Contacts
- Faculty and staff information
- Department heads and deans
- Administrative contacts

🎓 Student Services
- Placements and internships
- Research and projects
- Student support services

Your query appears to be outside my scope of knowledge.

Please ask me questions specifically about Vel Tech University and I'll be happy to help!

For example:
- "What courses does VTU offer?"
- "Tell me about the Computer Science department"
- "Where is TTS 3797's cabin?"
- "What are the admission requirements?"

Thank you for understanding! 😊
```

---

## 🔧 **Technical Implementation**

### **Function: `isVelTechRelated(query)`**

**Location**: `pages/api/chat.js:8-62`

**Logic**:
1. Convert query to lowercase
2. Check if any off-topic keyword matches → return `false`
3. Check if any on-topic keyword matches → return `true`
4. If no keywords match (ambiguous) → return `true` (allow through)

**Benefits**:
- ⚡ **Fast**: Simple keyword matching (< 1ms)
- 🎯 **Accurate**: Catches obvious off-topic queries
- 🔒 **Safe**: Allows ambiguous queries through (better UX)
- 📝 **Maintainable**: Easy to add more keywords

---

## 🧪 **Testing Instructions**

### **Test Off-Topic Queries:**

Try these queries - all should be rejected:

1. **Food/Cooking:**
   - "How to make a burger?"
   - "Pizza recipe"
   - "Best restaurants near me"

2. **Entertainment:**
   - "Latest movies"
   - "Who is the best actor?"
   - "Top songs 2024"

3. **Sports:**
   - "Cricket scores"
   - "Football match today"
   - "IPL schedule"

4. **Travel:**
   - "Best hotels in Chennai"
   - "Flight booking tips"
   - "Tourist places"

5. **Shopping:**
   - "Buy laptop online"
   - "Amazon deals"
   - "Product reviews"

6. **General:**
   - "Weather forecast"
   - "Bitcoin price"
   - "Political news"

---

### **Test On-Topic Queries:**

Try these queries - all should be processed normally:

1. **Academic:**
   - "Computer Science courses"
   - "Engineering programs"
   - "MBA admission"

2. **Faculty:**
   - "Who is TTS 3797?"
   - "Dean of Engineering"
   - "Faculty contact"

3. **Campus:**
   - "Library timings"
   - "Hostel facilities"
   - "Lab locations"

4. **Services:**
   - "Placement cell"
   - "Research opportunities"
   - "Student support"

---

## 📊 **Expected Console Output**

### **For Off-Topic Query:**
```
🔄 Chat API called with query: "How to make a burger?"
⚠️ Off-topic query detected: "How to make a burger?"
POST /api/chat 200 in 5ms
```

### **For On-Topic Query:**
```
🔄 Chat API called with query: "What courses does VTU offer?"
🔄 Preprocessing query...
🔍 Query expanded: ...
(continues with normal processing)
```

---

## 🎯 **Benefits**

1. ✅ **Prevents Misuse**: Users can't use VTU GPT for general questions
2. ✅ **Saves Resources**: No unnecessary API calls for off-topic queries
3. ✅ **Clear Boundaries**: Users know the system's scope
4. ✅ **Better UX**: Polite, helpful rejection message
5. ✅ **Easy Maintenance**: Simple to add more keywords

---

## 🔄 **Future Enhancements**

Optional improvements for later:

1. **Machine Learning Classification**: Use a small ML model for better detection
2. **Context-Aware Rejection**: Analyze query intent, not just keywords
3. **Learning System**: Track rejected queries to improve keyword list
4. **Multi-Language Support**: Detect off-topic queries in other languages
5. **Suggestion System**: Suggest similar on-topic queries

---

## 📝 **Adding More Keywords**

To add more keywords to the filter:

**File**: `pages/api/chat.js`

**Add On-Topic Keywords** (line 12-25):
```javascript
const onTopicKeywords = [
  // ... existing keywords ...
  'your-new-keyword', // Add here
];
```

**Add Off-Topic Keywords** (line 28-39):
```javascript
const offTopicKeywords = [
  // ... existing keywords ...
  'your-new-keyword', // Add here
];
```

---

## ✨ **Summary**

VTU GPT now has **intelligent scope control**:
- ❌ Rejects clearly off-topic queries instantly
- ✅ Processes VTU-related queries normally
- 🤔 Allows ambiguous queries through (safe fallback)
- 😊 Provides helpful, polite rejection messages
- ⚡ Fast, efficient, maintainable

**No more burger-making questions!** 🍔❌
**Only Vel Tech University questions!** 🎓✅

---

## 🧪 **Quick Test**

Try this now:
```
Query: "How to make a burger?"
Expected: Polite rejection message
```

Then try:
```
Query: "What is the Computer Science program?"
Expected: Detailed information about CS program
```

Enjoy your focused, on-topic VTU GPT! 🚀
