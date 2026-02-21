/**
 * Immutable value object for Risk/Reward configuration.
 * Defines risk parameters for trade sizing and execution.
 */
export class RiskModel {
  private constructor(
    private readonly riskPercent: number,
    private readonly rewardRatio: number,
  ) {
    if (riskPercent <= 0 || riskPercent > 100) {
      throw new Error('riskPercent must be between 0 and 100');
    }
    if (rewardRatio <= 0) {
      throw new Error('rewardRatio must be positive');
    }
  }

  /**
   * Factory: create with validation
   */
  public static from(
    riskPercent: number,
    rewardRatio: number,
  ): RiskModel {
    return new RiskModel(riskPercent, rewardRatio);
  }

  /**
   * Preset: conservative (1% risk, 1:2 RR)
   */
  public static conservative(): RiskModel {
    return new RiskModel(1, 2);
  }

  /**
   * Preset: moderate (2% risk, 1:2 RR)
   */
  public static moderate(): RiskModel {
    return new RiskModel(2, 2);
  }

  /**
   * Preset: aggressive (5% risk, 1:3 RR)
   */
  public static aggressive(): RiskModel {
    return new RiskModel(5, 3);
  }

  /**
   * Getters
   */
  public getRiskPercent(): number {
    return this.riskPercent;
  }

  public getRewardRatio(): number {
    return this.rewardRatio;
  }

  /**
   * Validation helper
   */
  public isRealistic(): boolean {
    // Warn if risk > 5% or reward ratio < 1
    return this.riskPercent <= 5 && this.rewardRatio >= 1;
  }

  /**
   * JSON representation
   */
  public toJSON() {
    return {
      riskPercent: this.riskPercent,
      rewardRatio: this.rewardRatio,
    };
  }
}
