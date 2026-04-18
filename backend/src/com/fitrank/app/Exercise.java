package com.fitrank.app;

public class Exercise extends BaseEntity {
    private String name;
    private String category;
    private String primaryMuscle;
    private String equipment;
    private String substitute;
    private String instructions;

    public Exercise() {
    }

    public Exercise(int id, String name, String category, String primaryMuscle, String equipment, String substitute) {
        super(id);
        this.name = name;
        this.category = category;
        this.primaryMuscle = primaryMuscle;
        this.equipment = equipment;
        this.substitute = substitute;
        this.instructions = "";
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getPrimaryMuscle() {
        return primaryMuscle;
    }

    public void setPrimaryMuscle(String primaryMuscle) {
        this.primaryMuscle = primaryMuscle;
    }

    public String getEquipment() {
        return equipment;
    }

    public void setEquipment(String equipment) {
        this.equipment = equipment;
    }

    public String getSubstitute() {
        return substitute;
    }

    public void setSubstitute(String substitute) {
        this.substitute = substitute;
    }

    public String getInstructions() {
        return instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    @Override
    public String toJson() {
        return "{\"id\":" + getId()
                + ",\"name\":\"" + JsonUtil.escape(name)
                + "\",\"category\":\"" + JsonUtil.escape(category)
                + "\",\"primaryMuscle\":\"" + JsonUtil.escape(primaryMuscle)
                + "\",\"equipment\":\"" + JsonUtil.escape(equipment)
                + "\",\"substitute\":\"" + JsonUtil.escape(substitute)
                + "\",\"instructions\":\"" + JsonUtil.escape(instructions) + "\"}";
    }
}
