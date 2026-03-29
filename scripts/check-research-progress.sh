#!/bin/bash

# Check research progress across all batch directories

echo "=== Richard Prince Research Progress ==="
echo ""

total_batches=17
completed_batches=0
total_books=0
total_jsons=0

for i in $(seq 1 $total_batches); do
  batch_dir="/tmp/prince-research-batch${i}"

  if [ -d "$batch_dir" ]; then
    json_count=$(find "$batch_dir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    log_count=$(find "$batch_dir" -name "*.txt" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$json_count" -gt 0 ]; then
      echo "✓ Batch $i: $json_count JSON files"
      ((completed_batches++))
      ((total_jsons += json_count))
    else
      echo "⏳ Batch $i: In progress..."
    fi
  else
    echo "⏹  Batch $i: Not started"
  fi
done

echo ""
echo "=== SUMMARY ==="
echo "Completed batches: $completed_batches / $total_batches"
echo "Research files generated: $total_jsons"
echo ""

if [ $total_jsons -gt 0 ]; then
  echo "Run consolidation script to update books.csv:"
  echo "  node scripts/consolidate-prince-research.js"
fi
