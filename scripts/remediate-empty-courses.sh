#!/usr/bin/env bash
# Publish video curriculum on the 53 LIVE courses that show 0 published lectures.
# Generated 2026-09-27 from live instructor API + exports/*/shell-spec.json.
# Usage:  bash scripts/remediate-empty-courses.sh --dry-run   # preview asset matches, no writes
#         bash scripts/remediate-empty-courses.sh             # live: attach + publish 12 lectures each
# Writes a full log to scripts/curriculum-load-<timestamp>.log
set -uo pipefail
cd "$(dirname "$0")/.."
DRY="${1:-}"
LOG="scripts/curriculum-load-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee "$LOG") 2>&1
echo "LOG: $LOG   MODE: ${DRY:-LIVE}   START: $(date)"

# 48 courses whose shell-spec has the courseId (slug alone is enough)
SLUGS=(
microsoft-ab-100-agentic-ai-architect-2026
comptia-datax-dy0-001-2026
databricks-data-engineer-associate-2026
microsoft-dp-100-azure-data-scientist-2026
github-copilot-gh-300-2026
certnexus-caip-aip-210-2026
ibm-watsonx-genai-engineer-associate-2026
snowflake-snowpro-genai-2026
cisco-300-640-dcai-data-center-ai-infrastructure-2026
isaca-aaia-ai-audit-2026
giac-gsec-security-essentials-2026
vmware-vcp-dcv-2v0-21-23-vsphere-8-2026
cisco-dccor-350-601-data-center-core-2026
cncf-cks-kubernetes-security-specialist-2026
fortinet-fcp-fortigate-7-6-administrator-2026
paloalto-pcnse-network-security-engineer-2026
cisco-scor-350-701-security-core-2026
iapp-cipp-us-privacy-2026
csa-ccsk-v5-cloud-security-2026
microsoft-sc-100-cybersecurity-architect-2026
microsoft-sc-300-identity-access-administrator-2026
isc2-sscp-2026
microsoft-sc-500-security-controls-cloud-ai-2026
isaca-crisc-2026
isaca-cisa-2026
cisco-cyberops-associate-cbrops-200-201-2026
eccouncil-ceh-v13-312-50-2026
isc2-cc-certified-in-cybersecurity-2026
isaca-cism-2026
microsoft-sc-900-security-compliance-identity-fundamentals-2026
microsoft-sc-200-security-operations-analyst-2026
isaca-aaism-ai-security-management
comptia-cysa-cs0-003-2026
isc2-cissp-2026
comptia-pentest-pt0-003-2026
google-professional-cloud-security-engineer-2026
isc2-ccsp-cloud-security-professional-2026
nvidia-ncp-ari-ai-rack-interconnect-2026
databricks-ml-professional-2026
oracle-oci-genai-professional-1z0-1127-2026
databricks-ml-associate-2026
oracle-oci-ai-foundations-1z0-1122-2026
cisco-ccna-200-301-2026
aws-cloud-practitioner-clf-c02-2026
microsoft-az-204-azure-developer-2026
microsoft-az-104-azure-administrator-2026
comptia-a-plus-core-2-220-1202-2026
comptia-a-plus-core-1-220-1201-2026
)

# 5 courses whose shell-spec is missing courseId -> pass it explicitly ("slug|courseId")
SLUG_CID=(
"comptia-network-plus-n10-009-2026|7305515"
"aws-certified-developer-associate-dva-c02-2026|7303531"
"microsoft-az-305-azure-solutions-architect-2026|7303525"
"hashicorp-terraform-associate-004-2026|7301147"
"google-cloud-professional-cloud-architect-2026|7301139"
)

ok=0; fail=0; failed=()
for s in "${SLUGS[@]}"; do
  echo; echo ">>> $s"
  if npm run curriculum:load -- --slug="$s" $DRY; then ok=$((ok+1)); else fail=$((fail+1)); failed+=("$s"); fi
done
for pair in "${SLUG_CID[@]}"; do
  s="${pair%%|*}"; cid="${pair##*|}"
  echo; echo ">>> $s (course=$cid)"
  if npm run curriculum:load -- --slug="$s" --course="$cid" $DRY; then ok=$((ok+1)); else fail=$((fail+1)); failed+=("$s"); fi
done

echo; echo "==== DONE  ok=$ok  fail=$fail   MODE: ${DRY:-LIVE} ===="
if [ "$fail" -gt 0 ]; then echo "FAILED SLUGS:"; printf '  %s\n' "${failed[@]}"; fi
echo "LOG saved to: $LOG"
echo "Verify: re-pull num_published_lectures per course (should be 12)."
