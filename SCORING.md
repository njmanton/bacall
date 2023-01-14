# Scoring

| player | predictions | pts | scaled pts |
| ------ | --- | ----------- | ---------- |
| SAF	| 13	| 39	| 33.6 |
| Clare	| 12	| 29	| 26.7 |
| Jules	| 12	| 34	| 25.0 |
| Caile	| 9	| 26	| 23.1 |
| James Tav	| 14	| 39	| 22.9 |
| Lewis	| 11	| 30	| 22.3 |
| Karen	| 13	| 34	| 21.4 |
| ReesDoran	| 10	| 30	| 18.2 |
| Robin	| 13	| 35	| 17.4 |
| James	| 11	| 30	| 16.2 |
| nick	| 10	| 30	| 15.2 |

The table shows the final scoring for 2019 by three different scoring methods:
* number of categories correctly predicted (original scoring mechanism)
* weighted score - categories are wroth 2/3/4 points (current scoring mechanism)
* scaled points - each category is worth points equal to the number of predictions, and those points are shared across all correct predictions

## Example:
For 11 players, if everyone picks the same winning nominee (e.g. _Shallow_), they each score `11/11` points.
For a category where only two players predicted the correct winner (e.g. _Black Panther_ for costume design), then they both score `11/2 = 5.5`. This incentivises not 'going with the herd', but with higher risk.

## Dampened Scoring:
Sharing points across all predictions can lead to very big scores (the only correct prediction out of 10 would score 10 points) and a lack of balance. So, taking the square root of predictions/correct predictions, you can reward risk-taking without 1-2 results dominating the scoring.