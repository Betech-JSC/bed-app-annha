#!/bin/bash
# RBAC Security Test Script
# Tests API permission enforcement with existing system accounts
# Using actual roles: super_admin, Ban Điều Hành, Kế Toán, Giám sát dự án, Khách Hàng

BASE_URL="http://localhost:8000/api"
PROJECT_ID=1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

PASS=0
FAIL=0
SKIP=0

check() {
  local label="$1"
  local expected_status="$2"
  local actual_status="$3"
  
  if [ "$actual_status" = "$expected_status" ]; then
    echo -e "  ${GREEN}✅ PASS${NC} | ${label} → ${actual_status} (expected ${expected_status})"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}❌ FAIL${NC} | ${label} → ${actual_status} (expected ${expected_status})"
    FAIL=$((FAIL+1))
  fi
}

login() {
  local email="$1"
  local password="$2"
  local result=$(curl -s -X POST "${BASE_URL}/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" 2>/dev/null)
  echo "$result" | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

try_login() {
  local email="$1"
  local passwords=("password" "12345678" "Password@123" "superadmin123" "admin123")
  local token=""
  for pwd in "${passwords[@]}"; do
    token=$(login "$email" "$pwd")
    if [ -n "$token" ]; then
      echo "$token"
      return
    fi
  done
}

api_get() {
  local token="$1"
  local endpoint="$2"
  curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}${endpoint}" \
    -H "Authorization: Bearer ${token}" \
    -H "Accept: application/json" 2>/dev/null
}

api_post() {
  local token="$1"
  local endpoint="$2"
  local data="$3"
  curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}${endpoint}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "${data}" 2>/dev/null
}

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   🔒 RBAC Security Test — BED Mobile CRM API${NC}"
echo -e "${BOLD}   System accounts | Project ID: ${PROJECT_ID}${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ─────────────────────────────────────────────
# Test 1: Unauthenticated (401)
# ─────────────────────────────────────────────
echo -e "${CYAN}━━━ Test 1: Unauthenticated Access → expect 401 ━━━${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/projects" -H "Accept: application/json" 2>/dev/null)
check "GET /projects (no token)" "401" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/projects/${PROJECT_ID}/costs" -H "Accept: application/json" 2>/dev/null)
check "GET /costs (no token)" "401" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/projects/${PROJECT_ID}/finance/cashflow" -H "Accept: application/json" 2>/dev/null)
check "GET /finance (no token)" "401" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/company-financial/summary" -H "Accept: application/json" 2>/dev/null)
check "GET /company-financial (no token)" "401" "$STATUS"
echo ""

# ─────────────────────────────────────────────
# Test 2: Super Admin (admin@betech.vn) → 200 for all
# ─────────────────────────────────────────────
echo -e "${CYAN}━━━ Test 2: Super Admin (admin@betech.vn) → 200 ━━━${NC}"
ADMIN_TOKEN=$(try_login "admin@betech.vn")
if [ -z "$ADMIN_TOKEN" ]; then
  # Try admin@annha.vn
  ADMIN_TOKEN=$(try_login "admin@annha.vn")
fi
if [ -z "$ADMIN_TOKEN" ]; then
  ADMIN_TOKEN=$(try_login "superadmin.test@test.com")
fi

if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "  ${GREEN}✅ Login OK${NC}"
  
  check "GET /projects" "200" "$(api_get "$ADMIN_TOKEN" "/projects")"
  check "GET /projects/1" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}")"
  check "GET /costs" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/costs")"
  check "GET /finance/cashflow" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/finance/cashflow")"
  check "GET /finance/profit-loss" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/finance/profit-loss")"
  check "GET /risks" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/risks")"
  check "GET /change-requests" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/change-requests")"
  check "GET /defects" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/defects")"
  check "GET /progress" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/progress")"
  check "GET /gantt" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/gantt")"
  check "GET /labor-productivity" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/labor-productivity")"
  check "GET /monitoring" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/monitoring")"
  check "GET /evm/latest" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/evm/latest")"
  check "GET /predictions" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/predictions")"
  check "GET /summary-report" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/summary-report")"
  check "GET /subcontractor-payments" "200" "$(api_get "$ADMIN_TOKEN" "/projects/${PROJECT_ID}/subcontractor-payments")"
  check "GET /company-financial" "200" "$(api_get "$ADMIN_TOKEN" "/company-financial/summary")"
else
  echo -e "  ${RED}❌ Login FAILED — skipping${NC}"
  SKIP=$((SKIP+17))
fi
echo ""

# ─────────────────────────────────────────────
# Test 3: Khách Hàng (toan@gmail.com) → 403 for finance/admin
# ─────────────────────────────────────────────
echo -e "${CYAN}━━━ Test 3: Khách Hàng (toan@gmail.com) → expect 403 ━━━${NC}"
KH_TOKEN=$(try_login "toan@gmail.com")

if [ -n "$KH_TOKEN" ]; then
  echo -e "  ${GREEN}✅ Login OK${NC}"
  
  # Finance endpoints — should be DENIED
  check "GET /finance/cashflow" "403" "$(api_get "$KH_TOKEN" "/projects/${PROJECT_ID}/finance/cashflow")"
  check "GET /finance/profit-loss" "403" "$(api_get "$KH_TOKEN" "/projects/${PROJECT_ID}/finance/profit-loss")"
  check "GET /company-financial" "403" "$(api_get "$KH_TOKEN" "/company-financial/summary")"
  check "GET /subcontractor-payments" "403" "$(api_get "$KH_TOKEN" "/projects/${PROJECT_ID}/subcontractor-payments")"
  check "GET /evm/latest" "403" "$(api_get "$KH_TOKEN" "/projects/${PROJECT_ID}/evm/latest")"
  
  # Write operations — should be DENIED
  check "POST /risks (create)" "403" "$(api_post "$KH_TOKEN" "/projects/${PROJECT_ID}/risks" '{"title":"Test","category":"scope","probability":"low","impact":"low"}')"
  check "POST /change-requests" "403" "$(api_post "$KH_TOKEN" "/projects/${PROJECT_ID}/change-requests" '{"title":"Test","description":"Desc","type":"scope"}')"
else
  echo -e "  ${YELLOW}⚠️  Login failed — skipping${NC}"
  SKIP=$((SKIP+7))
fi
echo ""

# ─────────────────────────────────────────────
# Test 4: Kế Toán (chi.pl@annha.vn) — finance access, no risk management
# ─────────────────────────────────────────────
echo -e "${CYAN}━━━ Test 4: Kế Toán (chi.pl@annha.vn) ━━━${NC}"
KT_TOKEN=$(try_login "chi.pl@annha.vn")

if [ -n "$KT_TOKEN" ]; then
  echo -e "  ${GREEN}✅ Login OK${NC}"
  
  # Should HAVE access to finance
  check "GET /costs (should access)" "200" "$(api_get "$KT_TOKEN" "/projects/${PROJECT_ID}/costs")"
  check "GET /company-financial" "200" "$(api_get "$KT_TOKEN" "/company-financial/summary")"
else
  echo -e "  ${YELLOW}⚠️  Login failed — skipping${NC}"
  SKIP=$((SKIP+2))
fi
echo ""

# ─────────────────────────────────────────────
# Test 5: Giám sát dự án (thinh.nd@annha.vn)
# ─────────────────────────────────────────────
echo -e "${CYAN}━━━ Test 5: Giám sát dự án (thinh.nd@annha.vn) ━━━${NC}"
GS_TOKEN=$(try_login "thinh.nd@annha.vn")

if [ -n "$GS_TOKEN" ]; then
  echo -e "  ${GREEN}✅ Login OK${NC}"
  
  # Should HAVE access to project management  
  check "GET /defects" "200" "$(api_get "$GS_TOKEN" "/projects/${PROJECT_ID}/defects")"
  check "GET /progress" "200" "$(api_get "$GS_TOKEN" "/projects/${PROJECT_ID}/progress")"
  check "GET /risks" "200" "$(api_get "$GS_TOKEN" "/projects/${PROJECT_ID}/risks")"
else
  echo -e "  ${YELLOW}⚠️  Login failed — skipping${NC}"
  SKIP=$((SKIP+3))
fi
echo ""

# ─────────────────────────────────────────────
# Test 6: Ban Điều Hành (long.np@annha.vn) → should access most things
# ─────────────────────────────────────────────
echo -e "${CYAN}━━━ Test 6: Ban Điều Hành (long.np@annha.vn) ━━━${NC}"
BDH_TOKEN=$(try_login "long.np@annha.vn")

if [ -n "$BDH_TOKEN" ]; then
  echo -e "  ${GREEN}✅ Login OK${NC}"
  
  check "GET /costs" "200" "$(api_get "$BDH_TOKEN" "/projects/${PROJECT_ID}/costs")"
  check "GET /finance/cashflow" "200" "$(api_get "$BDH_TOKEN" "/projects/${PROJECT_ID}/finance/cashflow")"
  check "GET /risks" "200" "$(api_get "$BDH_TOKEN" "/projects/${PROJECT_ID}/risks")"
  check "GET /company-financial" "200" "$(api_get "$BDH_TOKEN" "/company-financial/summary")"
  check "GET /summary-report" "200" "$(api_get "$BDH_TOKEN" "/projects/${PROJECT_ID}/summary-report")"
else
  echo -e "  ${YELLOW}⚠️  Login failed — skipping${NC}"
  SKIP=$((SKIP+5))
fi
echo ""

# ─────────────────────────────────────────────
# Test 7: No-role user (vu.ch@gmail.com) → should be 403
# ─────────────────────────────────────────────
echo -e "${CYAN}━━━ Test 7: No-Role User (vu.ch@gmail.com) → expect 403 ━━━${NC}"
NR_TOKEN=$(try_login "vu.ch@gmail.com")

if [ -n "$NR_TOKEN" ]; then
  echo -e "  ${GREEN}✅ Login OK${NC}"
  
  check "GET /costs" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/costs")"
  check "GET /finance/cashflow" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/finance/cashflow")"
  check "GET /risks" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/risks")"
  check "GET /defects" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/defects")"
  check "GET /gantt" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/gantt")"
  check "GET /labor-productivity" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/labor-productivity")"
  check "GET /subcontractor-payments" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/subcontractor-payments")"
  check "GET /company-financial" "403" "$(api_get "$NR_TOKEN" "/company-financial/summary")"
  check "GET /evm/latest" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/evm/latest")"
  check "GET /monitoring" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/monitoring")"
  check "GET /predictions" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/predictions")"
  check "GET /summary-report" "403" "$(api_get "$NR_TOKEN" "/projects/${PROJECT_ID}/summary-report")"
else
  echo -e "  ${YELLOW}⚠️  Login failed — skipping${NC}"
  SKIP=$((SKIP+12))
fi
echo ""

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   📊 RBAC Test Results${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}✅ PASSED: ${PASS}${NC}"
echo -e "  ${RED}❌ FAILED: ${FAIL}${NC}"
echo -e "  ${YELLOW}⏭️  SKIPPED: ${SKIP}${NC}"
echo ""
TOTAL=$((PASS+FAIL))
if [ "$FAIL" -eq 0 ] && [ "$TOTAL" -gt 0 ]; then
  echo -e "  ${GREEN}${BOLD}🎉 ALL ${TOTAL} TESTS PASSED — RBAC is working correctly!${NC}"
elif [ "$TOTAL" -eq 0 ]; then
  echo -e "  ${YELLOW}${BOLD}⚠️  No tests executed (login issues)${NC}"
else
  RATE=$((PASS * 100 / TOTAL))
  echo -e "  ${YELLOW}${BOLD}Pass rate: ${RATE}% (${PASS}/${TOTAL})${NC}"
  if [ "$FAIL" -gt 0 ]; then
    echo -e "  ${RED}${BOLD}⚠️  ${FAIL} test(s) need investigation${NC}"
  fi
fi
echo ""
