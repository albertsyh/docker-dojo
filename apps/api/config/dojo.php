<?php

return [
    // New participants per minute per client IP. A whole workshop room often
    // shares one public IP, so keep this comfortably above the class size.
    'join_per_minute' => (int) env('DOJO_JOIN_PER_MINUTE', 120),
];
